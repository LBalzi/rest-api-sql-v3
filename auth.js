const auth = require('basic-auth');
const bcrypt = require('bcryptjs');
const { User } = require('./models'); // Import User model

const authenticateUser = async (req, res, next) => {
  const credentials = auth(req); // Extract Basic Auth credentials

  if (!credentials || !credentials.name || !credentials.pass) {
    return res.status(401).json({ message: "Access Denied: Missing credentials" });
  }

  try {
    // Find user by email address
    const user = await User.findOne({ where: { emailAddress: credentials.name } });

    if (!user) {
      return res.status(401).json({ message: "Access Denied: User not found" });
    }

    // Compare entered password with hashed password in the database
    const passwordMatch = await bcrypt.compare(credentials.pass, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Access Denied: Invalid credentials" });
    }

    // store user in request object
    req.currentUser = user;
    next(); // Proceed to the next middleware/route handler
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = authenticateUser;