const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
let bodyParser = require('body-parser')
const mongoose = require('mongoose')

mongoose.connect("mongodb+srv://shepherd052603:2vmTZSgNJXnX4uTN@cluster0.quz1a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", { useNewUrlParser: true,
  useUnifiedTopology: true })

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const userSchema = new mongoose.Schema({
  username: {type: String, required: true}
})

let userModel = mongoose.model('user', userSchema)

const exerciseSchema = new mongoose.Schema({
  userId: {type: String, required: true},
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: Date, default: new Date()},
})

let exerciseModel = mongoose.model('exercise', exerciseSchema)

app.post('/api/users', (req, res) => {
  let username = req.body.username
  let newUser = new userModel({
    username: username
  })
  newUser.save()
  res.json(newUser)
})

app.get('/api/users', (req, res) => {
  userModel.find({}).then((users) => {
    res.json(users)
  })
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    let userId = req.params._id;
    let exerciseObj = {
      userId: userId,
      description: req.body.description,
      duration: req.body.duration
    };

    // If the date is provided, use it; otherwise, use the current date.
    exerciseObj.date = req.body.date ? new Date(req.body.date) : new Date();

    let newExercise = new exerciseModel(exerciseObj);

    // Use async/await instead of a callback
    const userFound = await userModel.findById(userId);
    if (!userFound) {
      return res.status(404).json({ error: 'User not found' });
    }

    await newExercise.save();

    res.json({
      _id: userFound._id,
      username: userFound.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    let userId = req.params._id;
    let responseObj = {};

    // Find user by ID
    const userFound = await userModel.findById(userId);
    if (!userFound) {
      return res.status(404).json({ error: 'User not found' });
    }

    responseObj = {
      _id: userFound._id,
      username: userFound.username
    };

    // Build query based on optional 'from', 'to', and 'limit' parameters
    let query = { userId: userId };
    let from = req.query.from ? new Date(req.query.from) : null;
    let to = req.query.to ? new Date(req.query.to) : null;
    let limit = parseInt(req.query.limit) || null;

    // Handle date range filtering
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
    }

    // Execute query and limit results if necessary
    let exercisesQuery = exerciseModel.find(query);
    if (limit) {
      exercisesQuery = exercisesQuery.limit(limit);
    }
    
    const exercises = await exercisesQuery;

    // Convert each exercise's date to a string using the Date API (toDateString)
    responseObj.log = exercises.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString() // Convert date to string
    }));

    responseObj.count = exercises.length;

    res.json(responseObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred' });
  }
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
