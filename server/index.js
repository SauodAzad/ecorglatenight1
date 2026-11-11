const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

const { Op } = require('sequelize');
const sequelize = require('./db');
const User = require('./models/User');
const { Truck, Cargo, Booking, BookingMessage, Notification, Complaint } = require('./models/Logistics');
const {
  initWhatsApp,
  sendWhatsAppMessage,
  notifyCargoCreated,
  notifyBookingOffer,
  notifyBookingStatusUpdate,
  notifyDeliveryCompleted,
  getWhatsAppStatus
} = require('./services/whatsapp');


const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// Lightweight health check endpoint for mobile IP verification
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// Public sanitized fleet & network overview (no PII) for interactive landing explorer
app.get('/api/public/overview', async (req, res) => {
  try {
    const [
      totalTrucks,
      availableTrucks,
      inTransitTrucks,
      totalBilties,
      completedDeliveries,
      trucks,
      cargos
    ] = await Promise.all([
      Truck.count(),
      Truck.count({ where: { status: 'Available' } }),
      Truck.count({ where: { status: 'In Transit' } }),
      Cargo.count({ where: { status: { [Op.in]: ['Truck Assigned', 'Loaded', 'In Transit', 'Delivered', 'Completed'] } } }),
      Cargo.count({ where: { status: { [Op.in]: ['Delivered', 'Completed'] } } }),
      Truck.findAll({
        attributes: ['id', 'plateNumber', 'capacity', 'loc', 'status', 'truckType', 'fitnessDoc', 'insuranceDoc'],
        order: [['status', 'ASC'], ['id', 'DESC']],
        limit: 24
      }),
      Cargo.findAll({
        where: { status: { [Op.in]: ['Truck Assigned', 'Loaded', 'In Transit', 'Delivered', 'Completed'] } },
        attributes: ['id', 'title', 'origin', 'destination', 'weight', 'status', 'assignedTruck', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 8
      })
    ]);

    const cities = new Set();
    const fleetVehicles = trucks.map((t) => {
      if (t.loc) cities.add(t.loc);
      return {
        id: t.id,
        plateNumber: t.plateNumber,
        truckType: t.truckType || 'Commercial Carrier',
        capacity: t.capacity,
        loc: t.loc,
        status: t.status,
        verified: Boolean(t.fitnessDoc && t.insuranceDoc),
      };
    });

    const recentDispatches = cargos.map((c) => {
      if (c.origin) cities.add(c.origin);
      if (c.destination) cities.add(c.destination);
      return {
        id: c.id,
        biltyNo: `BLT-${c.id}`,
        title: c.title,
        origin: c.origin,
        destination: c.destination,
        weight: c.weight,
        status: c.status,
        assignedTruck: c.assignedTruck || null,
      };
    });

    res.json({
      stats: {
        totalTrucks,
        availableTrucks,
        inTransitTrucks,
        totalBilties,
        completedDeliveries,
        activeHubs: cities.size,
      },
      fleetVehicles,
      recentDispatches,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── File Upload Setup ─────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Serve uploaded files as static assets
app.use('/uploads', express.static(uploadsDir));

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

// ─── Auth Routes ───────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, cnic, phone, businessName, businessRegNumber } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    let safeRole = (role || 'business').toLowerCase().trim();
    if (safeRole === 'fleet-owner' || safeRole === 'fleet_owner' || safeRole === 'driver') safeRole = 'truck_owner';
    if (safeRole === 'shipper') safeRole = 'business';

    const status = safeRole === 'admin' ? 'active' : 'pending';
    const user = await User.create({ name, email, password, role: safeRole, status, cnic, phone, businessName, businessRegNumber });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, name, email, role: user.role, status, cnic, phone, businessName, businessRegNumber } });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email, role: user.role, status: user.status } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── JWT Middleware ────────────────────────────────────────────────────────────

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    await User.update(req.body, { where: { id: req.user.id } });
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── File Upload Route ─────────────────────────────────────────────────────────

app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.filename, originalname: req.file.originalname });
});

// ─── Socket.io Setup ───────────────────────────────────────────────────────────

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(userId.toString());
      console.log(`User ${userId} joined room`);
    }
  });
  socket.on('disconnect', () => console.log('User disconnected'));
});

// ─── Initialize WhatsApp Web Client ──────────────────────────────────────────
initWhatsApp(io);

// ─── WhatsApp Status & Test Endpoints ────────────────────────────────────────
app.get('/api/whatsapp/status', authMiddleware, (req, res) => {
  res.json(getWhatsAppStatus());
});

app.post('/api/whatsapp/test', authMiddleware, async (req, res) => {
  const { phone, message } = req.body;
  if (!phone) return res.status(400).json({ message: 'Phone number is required' });
  const result = await sendWhatsAppMessage(phone, message || 'Hello from E-Cargo-Bilty WhatsApp Service!');
  res.json(result);
});


// ─── Notification Helper ───────────────────────────────────────────────────────

const sendNotification = async (userId, message) => {
  try {
    const notification = await Notification.create({ userId, message });
    io.to(userId.toString()).emit('notification', notification);
  } catch (e) {
    console.error(e);
  }
};

// ─── Truck Routes ──────────────────────────────────────────────────────────────

app.get('/api/trucks', authMiddleware, async (req, res) => {
  try {
    const where = {};
    if (req.query.ownerId) where.ownerId = req.query.ownerId;
    if (req.query.status) where.status = req.query.status;

    const trucks = await Truck.findAll({
      where,
      include: [{ model: User, as: 'owner', attributes: ['name', 'phone', 'businessName'] }]
    });

    const result = trucks.map(t => {
      const plain = t.toJSON();
      return {
        ...plain,
        id: t.id,
        _id: t.id,
        coordinates: [t.lat, t.lng],
        ownerName: plain.owner ? (plain.owner.businessName || plain.owner.name) : 'Unknown'
      };
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/trucks', authMiddleware, async (req, res) => {
  try {
    const { id: plateNumber, capacity, loc, status, coordinates, truckType, driverName, driverMobile, fitnessDoc, insuranceDoc } = req.body;
    const [lat, lng] = coordinates || [31.5204, 74.3587];
    const truck = await Truck.create({
      plateNumber,
      capacity,
      loc,
      ownerId: req.user.id,
      status: status || 'Available',
      lat,
      lng,
      truckType,
      driverName,
      driverMobile,
      fitnessDoc,
      insuranceDoc
    });
    res.status(201).json({ ...truck.toJSON(), _id: truck.id, coordinates: [truck.lat, truck.lng] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch('/api/trucks/:id', authMiddleware, async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData.id;
    delete updateData._id;
    if (req.body.coordinates) {
      updateData.lat = req.body.coordinates[0];
      updateData.lng = req.body.coordinates[1];
      delete updateData.coordinates;
    }
    if (req.body.plateNumber !== undefined) {
      updateData.plateNumber = req.body.plateNumber;
    } else if (
      typeof req.body.id === 'string' &&
      req.body.id.trim() !== '' &&
      req.body.id !== String(req.params.id) &&
      !/^\d+$/.test(req.body.id.trim())
    ) {
      updateData.plateNumber = req.body.id;
    }
    await Truck.update(updateData, { where: { id: req.params.id } });
    const truck = await Truck.findByPk(req.params.id);
    if (!truck) {
      return res.status(404).json({ message: 'Truck not found' });
    }
    res.json({ ...truck.toJSON(), _id: truck.id, coordinates: [truck.lat, truck.lng] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/trucks/:id', authMiddleware, async (req, res) => {
  try {
    await Truck.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Truck deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Cargo Routes ──────────────────────────────────────────────────────────────

const safeParseJson = (val, fallback) => {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    const parsed = JSON.parse(val);
    return parsed != null ? parsed : fallback;
  } catch (e) {
    return fallback;
  }
};

const formatCargo = (c) => {
  if (!c) return null;
  const plain = typeof c.toJSON === 'function' ? c.toJSON() : c;
  return {
    ...plain,
    products: safeParseJson(plain.products, []),
    pickupDetails: safeParseJson(plain.pickupDetails, {}),
    recipients: safeParseJson(plain.recipients, []),
    dimensions: safeParseJson(plain.dimensions, {}),
    specialHandling: safeParseJson(plain.specialHandling, []),
    packagingType: plain.packagingType || 'Cartons / Boxes',
    paymentTerms: plain.paymentTerms || 'Prepaid',
    _id: plain.id,
    transporterName: plain.transporter ? plain.transporter.name : (plain.transporterName || 'Unassigned'),
    businessOwnerName: plain.businessOwner ? (plain.businessOwner.businessName || plain.businessOwner.name) : (plain.businessOwnerName || 'Unknown')
  };
};

app.get('/api/cargo', authMiddleware, async (req, res) => {
  try {
    const where = {};
    if (req.query.transporterId) {
      where.transporterId = req.query.transporterId;
      where.status = { [Op.ne]: 'Draft' };
    }
    if (req.query.businessOwnerId) {
      where.businessOwnerId = req.query.businessOwnerId;
    }
    const cargo = await Cargo.findAll({
      where,
      include: [
        { model: User, as: 'transporter', attributes: ['name', 'phone'] },
        { model: User, as: 'businessOwner', attributes: ['name', 'phone', 'businessName'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(cargo.map(c => formatCargo(c)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/cargo', authMiddleware, async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.user.role === 'business') {
      data.businessOwnerId = req.user.id;
    } else if (req.user.role === 'transporter') {
      data.transporterId = req.user.id;
    }
    const cargo = await Cargo.create(data);

    // Trigger WhatsApp notification for new shipment
    User.findByPk(cargo.businessOwnerId).then(shipper => {
      const recipients = safeParseJson(cargo.recipients, []);
      notifyCargoCreated(cargo, shipper, recipients);
    }).catch(e => console.error('WhatsApp notifyCargoCreated error:', e.message));

    res.status(201).json({ ...cargo.toJSON(), _id: cargo.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch('/api/cargo/:id', authMiddleware, async (req, res) => {
  try {
    await Cargo.update(req.body, { where: { id: req.params.id } });
    const cargo = await Cargo.findByPk(req.params.id);

    // If status updated on cargo, trigger WhatsApp notification if booking exists
    if (['In Transit', 'Loaded', 'Completed'].includes(req.body.status)) {
      Booking.findOne({ where: { cargoId: cargo.id } }).then(async (booking) => {
        if (booking) {
          const truck = await Truck.findByPk(booking.truckId);
          const shipper = cargo.businessOwnerId ? await User.findByPk(cargo.businessOwnerId) : null;
          const transporter = booking.transporterId ? await User.findByPk(booking.transporterId) : null;
          let recipients = [];
          if (typeof cargo.recipients === 'string') {
            recipients = safeParseJson(cargo.recipients, []);
          } else if (Array.isArray(cargo.recipients)) {
            recipients = cargo.recipients;
          }
          notifyBookingStatusUpdate({
            booking,
            status: req.body.status,
            cargo,
            truck,
            shipper,
            transporter,
            recipients
          });
        }
      }).catch(e => console.error('WhatsApp cargo patch notification error:', e.message));
    }

    res.json({ ...cargo.toJSON(), _id: cargo.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


app.patch('/api/cargo/:id/respond', authMiddleware, async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    await Cargo.update({ status, rejectionReason }, { where: { id: req.params.id } });
    const cargo = await Cargo.findByPk(req.params.id);
    if (cargo.businessOwnerId) {
      await sendNotification(cargo.businessOwnerId, `Your shipment request for "${cargo.title}" has been ${status.toLowerCase()}${status === 'Rejected' ? ` (Reason: ${rejectionReason})` : ''}`);
    }
    res.json({ ...cargo.toJSON(), _id: cargo.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/cargo/:id', authMiddleware, async (req, res) => {
  try {
    await Cargo.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Cargo deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Booking Routes ────────────────────────────────────────────────────────────

const bookingIncludes = [
  { model: BookingMessage, as: 'messages' },
  {
    model: Cargo,
    as: 'cargo',
    include: [
      { model: User, as: 'transporter', attributes: ['name', 'phone'] },
      { model: User, as: 'businessOwner', attributes: ['name', 'phone', 'businessName'] }
    ]
  }
];

app.get('/api/bookings', authMiddleware, async (req, res) => {
  try {
    const where = {};
    if (req.query.truckOwnerId) where.truckOwnerId = req.query.truckOwnerId;
    if (req.query.transporterId) where.transporterId = req.query.transporterId;
    if (req.query.status) where.status = { [Op.in]: req.query.status.split(',') };

    const bookings = await Booking.findAll({
      where,
      include: bookingIncludes,
      order: [['createdAt', 'DESC']]
    });
    res.json(bookings.map(b => {
      const plain = b.toJSON();
      return {
        ...plain,
        _id: b.id,
        cargo: plain.cargo ? formatCargo(plain.cargo) : null
      };
    }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/bookings', authMiddleware, async (req, res) => {
  try {
    const deliveryCode = req.body.deliveryCode || Math.floor(1000 + Math.random() * 9000).toString();
    const booking = await Booking.create({ ...req.body, deliveryCode, transporterId: req.user.id });
    await sendNotification(booking.truckOwnerId, `New booking request for ${booking.cargoTitle}`);
    io.emit('booking_updated');


    // Trigger WhatsApp notification to Truck Owner/Driver
    Promise.all([
      Truck.findByPk(booking.truckId, { include: [{ model: User, as: 'owner' }] }),
      Cargo.findByPk(booking.cargoId),
      User.findByPk(req.user.id)
    ]).then(([truck, cargo, transporter]) => {
      if (truck) {
        notifyBookingOffer(booking, truck, cargo, transporter);
      }
    }).catch(e => console.error('WhatsApp notifyBookingOffer error:', e.message));

    res.status(201).json({ ...booking.toJSON(), _id: booking.id, messages: [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch('/api/bookings/:id', authMiddleware, async (req, res) => {
  try {
    // Handle message push separately
    if (req.body.$push && req.body.$push.messages) {
      const msg = req.body.$push.messages;
      await BookingMessage.create({ bookingId: req.params.id, sender: msg.sender, text: msg.text });
      const booking = await Booking.findByPk(req.params.id, {
        include: bookingIncludes
      });
      const plainMsg = booking.toJSON();
      io.emit('booking_updated');
      return res.json({
        ...plainMsg,
        _id: booking.id,
        cargo: plainMsg.cargo ? formatCargo(plainMsg.cargo) : null
      });
    }

    await Booking.update(req.body, { where: { id: req.params.id } });
    const booking = await Booking.findByPk(req.params.id, {
      include: bookingIncludes
    });

    // When transit starts: update cargo status and notify business owner
    if (req.body.status === 'In Transit' && booking.cargoId) {
      const cargo = await Cargo.findByPk(booking.cargoId);
      if (cargo) {
        await Cargo.update({ status: 'In Transit' }, { where: { id: booking.cargoId } });
        if (cargo.businessOwnerId) {
          await sendNotification(
            cargo.businessOwnerId,
            `🚛 Your shipment "${booking.cargoTitle}" is now In Transit on truck ${booking.truckPlate}.`
          );
        }
      }
    }

    // When booking is Accepted: notify transporter
    if (req.body.status === 'Accepted') {
      await sendNotification(
        booking.transporterId,
        `✅ Truck owner accepted your booking request for "${booking.cargoTitle}" (Truck: ${booking.truckPlate}).`
      );
    }

    // When booking is Rejected: notify transporter
    if (req.body.status === 'Rejected') {
      await sendNotification(
        booking.transporterId,
        `❌ Truck owner rejected your booking request for "${booking.cargoTitle}".`
      );
    }

    // General notification to the other party for other status changes
    const targetId = req.user.id.toString() === booking.truckOwnerId.toString()
      ? booking.transporterId
      : booking.truckOwnerId;
    if (!['Accepted', 'Rejected', 'In Transit'].includes(req.body.status)) {
      await sendNotification(targetId, `Booking status updated to ${booking.status} for ${booking.cargoTitle}`);
    }

    io.emit('booking_updated');

    // Trigger WhatsApp notification for booking transit state changes (Shipper, Transporter, AND all Recipients)
    Promise.all([
      Truck.findByPk(booking.truckId),
      Cargo.findByPk(booking.cargoId),
      User.findByPk(booking.transporterId)
    ]).then(async ([truck, cargo, transporter]) => {
      const shipper = cargo && cargo.businessOwnerId ? await User.findByPk(cargo.businessOwnerId) : null;
      let recipients = [];
      if (cargo && cargo.recipients) {
        if (typeof cargo.recipients === 'string') {
          recipients = safeParseJson(cargo.recipients, []);
        } else if (Array.isArray(cargo.recipients)) {
          recipients = cargo.recipients;
        }
      }

      // Ensure deliveryCode exists on the booking if status is In Transit
      if (req.body.status === 'In Transit' && !booking.deliveryCode) {
        const generatedCode = Math.floor(1000 + Math.random() * 9000).toString();
        await Booking.update({ deliveryCode: generatedCode }, { where: { id: booking.id } });
        booking.deliveryCode = generatedCode;
      }

      notifyBookingStatusUpdate({
        booking,
        status: req.body.status,
        cargo,
        truck,
        shipper,
        transporter,
        recipients
      });
    }).catch(e => console.error('WhatsApp notifyBookingStatusUpdate error:', e.message));

    const plainBooking = booking.toJSON();
    res.json({
      ...plainBooking,
      _id: booking.id,
      cargo: plainBooking.cargo ? formatCargo(plainBooking.cargo) : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



// ─── Booking Complete Route ────────────────────────────────────────────────────

app.post('/api/bookings/:id/complete', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    const { pod, deliveryCode, receiverSignature, podPhotoUrl, conditionStatus, discrepancyNotes } = req.body;

    await Booking.update({ 
      status: 'Completed', 
      completedAt: new Date(), 
      pod: pod || podPhotoUrl,
      deliveryCode: deliveryCode || null,
      receiverSignature: receiverSignature || null,
      podPhotoUrl: podPhotoUrl || null,
      conditionStatus: conditionStatus || 'Good Condition',
      discrepancyNotes: discrepancyNotes || null
    }, { where: { id: req.params.id } });
    await Truck.update({ status: 'Available' }, { where: { id: booking.truckId } });
    if (booking.cargoId) {
      await Cargo.update(
        { status: 'Completed', assignedTruck: booking.truckPlate },
        { where: { id: booking.cargoId } }
      );
    }
    await sendNotification(booking.transporterId, `Delivery completed for ${booking.cargoTitle}.`);

    io.emit('booking_updated');

    // Trigger WhatsApp notification on delivery completion to Shipper AND Recipients
    Cargo.findByPk(booking.cargoId).then(async (cargo) => {
      if (cargo) {
        const shipper = cargo.businessOwnerId ? await User.findByPk(cargo.businessOwnerId) : null;
        let recipients = [];
        if (typeof cargo.recipients === 'string') {
          recipients = safeParseJson(cargo.recipients, []);
        } else if (Array.isArray(cargo.recipients)) {
          recipients = cargo.recipients;
        }
        notifyDeliveryCompleted(booking, cargo, shipper, recipients);
      }
    }).catch(e => console.error('WhatsApp notifyDeliveryCompleted error:', e.message));

    const updated = await Booking.findByPk(req.params.id);
    res.json({ message: 'Booking marked as completed', booking: { ...updated.toJSON(), _id: updated.id } });
  } catch (error) {

    res.status(500).json({ message: error.message });
  }
});

// ─── Notification Routes ───────────────────────────────────────────────────────

app.get('/api/notifications', authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(notifications.map(n => ({ ...n.toJSON(), _id: n.id })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/notifications/:id', authMiddleware, async (req, res) => {
  try {
    await Notification.destroy({ where: { id: req.params.id, userId: req.user.id } });
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Complaint Routes ──────────────────────────────────────────────────────────

app.post('/api/complaints', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const complaint = await Complaint.create({
      ...req.body,
      userId: req.user.id,
      userName: user.name,
      userRole: user.role
    });
    res.status(201).json({ ...complaint.toJSON(), _id: complaint.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/complaints', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  try {
    const complaints = await Complaint.findAll({ order: [['createdAt', 'DESC']] });
    res.json(complaints.map(c => ({ ...c.toJSON(), _id: c.id })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch('/api/complaints/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  try {
    await Complaint.update(req.body, { where: { id: req.params.id } });
    const complaint = await Complaint.findByPk(req.params.id);
    res.json({ ...complaint.toJSON(), _id: complaint.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Admin User Management ────────────────────────────────────────────────────

app.get('/api/users', authMiddleware, async (req, res) => {
  const isTransporterQuery = req.query.role === 'transporter';
  if (req.user.role !== 'admin' && !isTransporterQuery) return res.status(403).json({ message: 'Access denied' });
  try {
    const where = {};
    if (isTransporterQuery) {
      where.role = 'transporter';
      where.status = 'active';
    } else if (req.query.role) {
      where.role = req.query.role;
    }
    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] }
    });

    const usersWithCounts = await Promise.all(users.map(async (u) => {
      let shipmentsCount = 0;
      if (u.role === 'business') {
        shipmentsCount = await Cargo.count({ where: { businessOwnerId: u.id } });
      } else if (u.role === 'transporter') {
        shipmentsCount = await Cargo.count({ where: { transporterId: u.id } });
      } else if (u.role === 'truck_owner') {
        shipmentsCount = await Booking.count({ where: { truckOwnerId: u.id } });
      }
      return {
        ...u.toJSON(),
        _id: u.id,
        shipmentsCount,
        joinedDate: u.createdAt ? u.createdAt.toISOString().split('T')[0] : ''
      };
    }));

    res.json(usersWithCounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch('/api/users/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  try {
    const { status, reason } = req.body;
    await User.update(req.body, { where: { id: req.params.id } });
    const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    let msg = `Your account status has been updated to: ${user.status}`;
    if (status === 'rejected' && reason) {
      msg += `. Reason: ${reason}`;
    }
    await sendNotification(user.id, msg);
    res.json({ ...user.toJSON(), _id: user.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/admin/stats', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  try {
    const [
      usersCount,
      pendingUsersCount,
      trucksCount,
      activeTrucksCount,
      bookingsCount,
      complaintsCount,
      businessOwnersCount,
      transportersCount,
      truckOwnersCount
    ] = await Promise.all([
      User.count(),
      User.count({ where: { status: { [Op.in]: ['pending', 'pending_verification'] } } }),
      Truck.count(),
      Truck.count({ where: { status: 'In Transit' } }),
      Booking.count(),
      Complaint.count({ where: { status: 'Open' } }),
      User.count({ where: { role: 'business' } }),
      User.count({ where: { role: 'transporter' } }),
      User.count({ where: { role: 'truck_owner' } })
    ]);

    // Active shipments: cargo currently in active transportation states
    const activeShipmentsCount = await Cargo.count({
      where: { status: { [Op.in]: ['Accepted', 'Truck Assigned', 'Loaded', 'In Transit'] } }
    });

    // Total Bilties: cargo that progressed beyond pending
    const totalBiltiesCount = await Cargo.count({
      where: { status: { [Op.in]: ['Truck Assigned', 'Loaded', 'In Transit', 'Delivered', 'Completed'] } }
    });

    // Truck utilization calculations
    const utilizationRate = trucksCount > 0 ? Math.round((activeTrucksCount / trucksCount) * 100) : 0;

    // Monthly stats for Shipments & Bilties (rolling last 6 months ending in current month)
    const now = new Date();
    const monthlyStats = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let offset = 5; offset >= 0; offset--) {
      const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);

      const realShipments = await Cargo.count({
        where: {
          createdAt: {
            [Op.between]: [start, end]
          }
        }
      });

      const realBilties = await Cargo.count({
        where: {
          status: { [Op.in]: ['Truck Assigned', 'Loaded', 'In Transit', 'Delivered', 'Completed'] },
          createdAt: {
            [Op.between]: [start, end]
          }
        }
      });

      monthlyStats.push({
        month: monthNames[start.getMonth()],
        shipments: realShipments,
        bilties: realBilties
      });
    }

    res.json({
      users: usersCount,
      pendingUsers: pendingUsersCount,
      trucks: trucksCount,
      activeTrucks: activeTrucksCount,
      utilizationRate: utilizationRate,
      activeShipments: activeShipmentsCount,
      totalBilties: totalBiltiesCount,
      complaints: complaintsCount,
      roleBreakdown: {
        business: businessOwnersCount,
        transporter: transportersCount,
        truck_owner: truckOwnersCount
      },
      monthlyStats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Detailed Shipments for Admin ──────────────────────────────────────────────
app.get('/api/admin/shipments', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  try {
    const [cargo, allBookings] = await Promise.all([
      Cargo.findAll({
        include: [
          { model: User, as: 'transporter', attributes: ['name', 'phone'] },
          { model: User, as: 'businessOwner', attributes: ['name', 'phone', 'businessName'] }
        ],
        order: [['createdAt', 'DESC']]
      }),
      Booking.findAll({ order: [['createdAt', 'DESC']] })
    ]);

    const bookingByCargoId = new Map();
    allBookings.forEach(b => {
      if (b.cargoId && !bookingByCargoId.has(b.cargoId)) {
        bookingByCargoId.set(b.cargoId, b.toJSON());
      }
    });

    const result = cargo.map(c => {
      const formatted = formatCargo(c);
      const booking = bookingByCargoId.get(c.id);
      const hasBilty = Boolean(
        booking ||
        formatted.assignedTruck ||
        ['Truck Assigned', 'Loaded', 'In Transit', 'Delivered', 'Completed'].includes(formatted.status)
      );
      return {
        ...formatted,
        truckPlate: booking?.truckPlate || formatted.assignedTruck || null,
        biltyNo: hasBilty ? `BLT-${c.id}` : '-',
        price: booking?.price || (formatted.totalFare ? String(Math.round(formatted.totalFare)) : null),
        completedAt: booking?.completedAt || null,
        receiverSignature: booking?.receiverSignature || null
      };
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Activity Log for Admin ───────────────────────────────────────────────────
app.get('/api/admin/activity', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  try {
    const [recentUsers, recentCargo, recentBookings] = await Promise.all([
      User.findAll({ limit: 5, order: [['createdAt', 'DESC']] }),
      Cargo.findAll({ limit: 5, order: [['createdAt', 'DESC']], include: [{ model: User, as: 'businessOwner', attributes: ['name'] }] }),
      Booking.findAll({ limit: 5, order: [['createdAt', 'DESC']] })
    ]);

    const logs = [];
    recentUsers.forEach(u => {
      logs.push({
        type: 'user',
        title: 'New User Registered',
        description: `${u.name} registered as a ${u.role.replace('_', ' ')}.`,
        date: u.createdAt
      });
    });
    recentCargo.forEach(c => {
      logs.push({
        type: 'cargo',
        title: 'Shipment Created',
        description: `Shipment for "${c.title}" (${c.weight} tons) created by ${c.businessOwner ? c.businessOwner.name : 'Business Owner'}.`,
        date: c.createdAt
      });
    });
    recentBookings.forEach(b => {
      logs.push({
        type: 'booking',
        title: `Booking ${b.status}`,
        description: `Booking for cargo "${b.cargoTitle}" was marked ${b.status.toLowerCase()}.`,
        date: b.createdAt
      });
    });

    logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(logs.slice(0, 10));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Start Server ──────────────────────────────────────────────────────────────

const isSqlite = sequelize.getDialect() === 'sqlite';

const ensureSqliteColumns = async () => {
  if (!isSqlite) return;
  const queries = [
    `ALTER TABLE cargo ADD COLUMN packaging_type TEXT;`,
    `ALTER TABLE cargo ADD COLUMN dimensions TEXT;`,
    `ALTER TABLE cargo ADD COLUMN special_handling TEXT;`,
    `ALTER TABLE cargo ADD COLUMN declared_value TEXT;`,
    `ALTER TABLE cargo ADD COLUMN payment_terms TEXT DEFAULT 'Prepaid';`,
    `ALTER TABLE cargo ADD COLUMN sender_ntn TEXT;`,
    `ALTER TABLE cargo ADD COLUMN delivery_notes TEXT;`,
    `ALTER TABLE cargo ADD COLUMN chargeable_weight TEXT;`,
    `ALTER TABLE cargo ADD COLUMN volumetric_weight TEXT;`,
    `ALTER TABLE cargo ADD COLUMN base_fare REAL;`,
    `ALTER TABLE cargo ADD COLUMN fuel_surcharge REAL;`,
    `ALTER TABLE cargo ADD COLUMN tax_amount REAL;`,
    `ALTER TABLE cargo ADD COLUMN total_fare REAL;`,
    `ALTER TABLE bookings ADD COLUMN delivery_code TEXT;`,
    `ALTER TABLE bookings ADD COLUMN receiver_signature TEXT;`,
    `ALTER TABLE bookings ADD COLUMN pod_photo_url TEXT;`,
    `ALTER TABLE bookings ADD COLUMN condition_status TEXT DEFAULT 'Good Condition';`,
    `ALTER TABLE bookings ADD COLUMN discrepancy_notes TEXT;`
  ];
  for (const q of queries) {
    try {
      await sequelize.query(q);
    } catch (e) {
      // Column already exists or table handles it
    }
  }
};

sequelize.sync(isSqlite ? {} : { alter: true })
  .then(async () => {
    await ensureSqliteColumns();
    console.log(`✅ ${isSqlite ? 'SQLite' : 'MySQL'} Database synced`);
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT} (0.0.0.0)`);
    });
  })
  .catch(err => {
    console.error('❌ Database sync failed:', err.message);
    process.exit(1);
  });
