'use strict';
const authenticateUser = require('./auth'); // Import authentication middleware


// load modules
const express = require('express');
const morgan = require('morgan');
// load sequelize
const Sequelize = require('sequelize');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'fsjstd-restapi.db'
});
//test connection to the database
(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection to the database successful!');
  } catch (error) {
    console.error('Error connecting to the database: ', error);
  }
})();

//import models
const { User, Course } = require('./models'); // Import your models


// variable to enable global error logging
const enableGlobalErrorLogging = process.env.ENABLE_GLOBAL_ERROR_LOGGING === 'true';

// create the Express app
const app = express();

// setup morgan which gives us http request logging
app.use(morgan('dev'));
app.use(express.json());

// setup a friendly greeting for the root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the REST API project!',
  });
});

//USER ROUTES

// GET: Return the currently authenticated user
app.get('/api/users', authenticateUser, async (req, res) => {
  try {
    const user = await User.findOne({
      where: { emailAddress: req.currentUser.emailAddress } // Get user from auth middleware
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user); // Return user details
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST route to add a new user
app.post('/api/users', async (req, res) => {
  try {
    // Get the user data from the request body.
    const user = req.body;

    // Create the user in the database
    const newUser = await User.create(user);

    // Set Location header to the new course URI
    res.setHeader('Location', `/`);

    // Return 201 Created with no content
    return res.status(201).end();
  } catch (error) {
    // Handle Sequelize validation errors
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors.map(err => err.message) // Extract error messages
      });
    } 

    // Log and return a 500 error for other issues
    console.error('Something went wrong:', error);
    return res.status(500).json({ error: 'Something broke on our end. Try again later.' });
  }
});

// COURSES ROUTES

//GET courses route
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.findAll({
      include: {
        model: User, // Include associated User
        attributes: ["firstName", "lastName", "emailAddress"] // Select only these fields
      }
    });
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//GET a single course route
app.get('/api/courses/:id', async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id, {
      include: {
        model: User, // Include the associated User
        attributes: ["firstName", "lastName", "emailAddress"] // Select only these fields
      }
    });
  if (!course) {
    return res.status(404).json({
      message: "Course was not found",
    }) 
  } else {
    res.json(course);
  }
} catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
  });

// POST route to add a new course
app.post('/api/courses', authenticateUser, async (req, res) => {
  try {
    // Get the course data from the request body.
    const course = req.body;

    // Create the course in the database
    const newCourse = await Course.create(course);

    // Set Location header to the new course URI
    res.setHeader('Location', `/api/courses/${newCourse.id}`);
    

    // Return 201 Created with no content
    return res.status(201).end();
  } catch (error) {
    // Handle Sequelize validation errors
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors.map(err => err.message) // Extract error messages
      });
    } 

    // Log and return a 500 error for other issues
    console.error('Something went wrong:', error);
    return res.status(500).json({ error: 'Something broke on our end. Try again later.' });
  }
});

//PUT update a course route
app.put('/api/courses/:id', authenticateUser, async (req, res) => {
  try {
  const course = await Course.findByPk(req.params.id);
  if (!course) {
    return res.status(404).json({
      message: "Course was not found",
    }) 
  } else {
    const newCourse = req.body;
    course.set({
      title: newCourse.title,
      description: newCourse.description,
      estimatedTime: newCourse.estimatedTime,
      materialsNeeded: newCourse.materialsNeeded
    });
    // Save changes to the database
    await course.save();
    //return 204 and no content
    res.status(204).end();
    
  }
} catch (error) {
  // Handle Sequelize validation errors
  if (error.name === "SequelizeValidationError") {
    return res.status(400).json({
      message: "Validation error",
      errors: error.errors.map(err => err.message) // Extract error messages
    });
  } 

  // Log and return a 500 error for other issues
  console.error('Something went wrong:', error);
  return res.status(500).json({ error: 'Something broke on our end. Try again later.' });
}
});

//DELETE a single course route
app.delete('/api/courses/:id', authenticateUser, async (req, res) => {
  try {
  const course = await Course.findByPk(req.params.id);
  if (!course) {
    return res.status(404).json({
      message: "Course was not found",
    }) 
  }
    await Course.destroy({
      where: {
        id: req.params.id,
      }
    })
    res.status(204).end();
  }
 catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
  });



// send 404 if no other route matched
app.use((req, res) => {
  res.status(404).json({
    message: 'Route Not Found',
  });
});

// setup a global error handler
app.use((err, req, res, next) => {
  if (enableGlobalErrorLogging) {
    console.error(`Global error handler: ${JSON.stringify(err.stack)}`);
  }

  res.status(err.status || 500).json({
    message: err.message,
    error: {},
  });
});

// set our port
app.set('port', process.env.PORT || 5000);

// start listening on our port
const server = app.listen(app.get('port'), () => {
  console.log(`Express server is listening on port ${server.address().port}`);
});
