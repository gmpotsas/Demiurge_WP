const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;
app.listen(port,() => console.log(`listening to ${port}`));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({limit : '10mb'}));


var mysql = require('mysql');
const con = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'Demiurge',
    connectionLimit: 100  
});


//Check for available lockers before submiting users
app.get('/lockernum', (request, response) => {

    // Use a connection from the pool
    con.query("SELECT locker_id FROM Lockers", (err, result) => {
        if (err) {
            console.error(err);
            response.status(500).send('Error fetching data');
            return;
        }
        response.json(result);
    });
});

//Admins submit users to the database
app.post('/submituser', (request, response) => {
    //store data
    const {name,surname,lockerNumber}=request.body;
    //check for all the fields
    if (!name || !surname || !lockerNumber) {
        return response.status(400).json({ error: "All fields are required" });
    }
    // Use a connection from the pool
    con.query("CALL AddUserWithChosenLocker(?,?,?);",[name,surname,lockerNumber], (err, result) => {
        if (err) {
            console.error(err);
            response.status(500).send('Error fetching data');
            return;
        }
        else{
            console.log("Entry was Succesfull")
        };
    });
});

//Send lockerid,password,userid for identification
app.get('/usercred', (request, response) => {
    // Use a connection from the pool
    con.query("SELECT locker_id,user_id,locker_password FROM Lockers", (err, result) => {
        if (err) {
            console.error(err);
            response.status(500).send('Error fetching data');
            return;
        }
        response.json(result);
    });
});



// Retrieve existing workout plan for a user (by user_id)
// Retrieve existing workout plan for a user (by user_id, routine, and day)
app.get('/api/getWorkoutPlan', (req, res) => {
    const  {user_id} = req.query;
    if (!user_id) {
        return res.status(400).json({ success: false, message: "Missing required parameters: userId, routine, and day" });
    }
    con.query(
        "SELECT routine, day, plan_json, updated_at FROM WorkoutPlans WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1",
        [user_id],
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: "Database error" });
            }
            if (result.length) {
                // Parse plan_json before sending it back, and include updated_at in response
                const plan = result[0];
                plan.plan_json = JSON.parse(plan.plan_json);
                return res.json({ success: true, plan, updated_at: plan.updated_at });
            } else {
                return res.json({ success: false, message: "No plan found" });
            }
        }
    );
});

app.get('/api/getWorkoutPlan1', (req, res) => {
  const { user_id, routine, day, date } = req.query;
  if (!user_id || !routine || !day) {
    return res.status(400).json({ success: false, message: "Missing required parameters" });
  }

  // build a query that filters by the calendar date if provided
  let sql    = `SELECT routine, day, plan_json, updated_at
                FROM WorkoutPlans
                WHERE user_id=? AND routine=? AND day=?`;
  const params = [user_id, routine, day];

  if (date) {
    sql += ` AND DATE(created_at)=?`;
    params.push(date);
  }
  sql += ` ORDER BY updated_at DESC LIMIT 1`;

  con.query(sql, params, (err, result) => {
    if (err)   return res.status(500).json({ success: false, message: "DB error" });
    if (result.length) {
      const plan = result[0];
      plan.plan_json = JSON.parse(plan.plan_json);
      return res.json({ success: true, plan });
    }
    return res.json({ success: false, message: "No plan found" });
  });
});

app.post('/api/saveWorkoutPlan', (req, res) => {
  const { userId, routine, day, planJson, date } = req.body;
  if (!userId || !routine || !day || !planJson || !date) {
    return res.status(400).json({ success: false, message: 'Missing fields.' });
  }

  // upsert by routine/day; always insert a new record but stamp created_at = date
  // (or update existing—your choice; here’s a simple insert)
  con.query(
    `INSERT INTO WorkoutPlans
      (user_id, routine, day, plan_json, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, routine, day, JSON.stringify(planJson), date],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: 'DB error.' });
      res.json({ success: true, message: 'Plan saved.' });
    }
  );
});

// GET endpoint to load user progress for a specific date
app.get('/api/userprogress', (req, res) => {
  const { user_id, routine , day, date } = req.query;
  if (!user_id || !day || !routine || !date) {
    return res.status(400).json({ success: false, message: 'Missing required query parameters.' });
  }
  
  // Build a formatted date string (YYYY-MM-DD) from day, month, year parameters.
  const query = `
    SELECT * FROM UserProgress
    WHERE user_id = ? 
      AND routine = ?
      AND day = ?
      AND DATE(created_at) = ?
  `;
  
  const queryParams = [user_id, routine, day,date];
  
  con.query(query, queryParams, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Database error.' });
    }
    if (results.length > 0) {
      const row = results[0];
      const planData = row.plan_json ? JSON.parse(row.plan_json) : {};
      res.json({ bodyweight: row.bodyweight, table: planData, day: row.day });
    } else {
      res.status(404).json({ success: false, message: 'No records found for the specified day.' });
    }
  });
});
  
// POST endpoint to save or update user progress
app.post('/api/userprogress', (req, res) => {
    const { user_id, routine, day, bodyweight, date, table } = req.body;
    if (!user_id || !routine || !day || !bodyweight || !date || !table) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }
    
    // Use the provided local date directly.
    const formattedDate = date;  // e.g., "2025-04-12 00:00:00" if the user selected 12th April
  
    const planJson = JSON.stringify(table);
    const rest = false;
    
    // When matching on date, extract the date portion (YYYY-MM-DD) from the local date.
    con.query(
      "SELECT * FROM UserProgress WHERE user_id = ? AND DATE(created_at) = ?",
      [user_id, formattedDate.split(' ')[0]], // using the date part only
      (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false, message: 'Database error.' });
        }
    
        if (results.length > 0) {
          con.query(
            "UPDATE UserProgress SET routine = ?, day = ?, bodyweight = ?, plan_json = ?, rest = ? WHERE user_id = ? AND DATE(created_at) = ?",
            [routine, day, bodyweight, planJson, rest, user_id, formattedDate.split(' ')[0]],
            (err, result) => {
              if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: 'Database error.' });
              }
              res.json({ success: true, message: 'Progress updated.' });
            }
          );
        } else {
          con.query(
            "INSERT INTO UserProgress (user_id, routine, day, bodyweight, plan_json, created_at, rest) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [user_id, routine, day, bodyweight, planJson, formattedDate, rest],
            (err, result) => {
              if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: 'Database error.' });
              }
              res.json({ success: true, message: 'Progress saved.' });
            }
          );
        }
      }
    );
  });

  // Example: /api/userinfo?userId=1
app.get('/api/userinfo', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    console.error('Missing userId parameter.');
    return res.status(400).json({ success: false, message: 'Missing userId parameter.' });
  }

  const query = 'SELECT name FROM Users WHERE user_id = ?';
  con.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching user info:', err);
      return res.status(500).json({ success: false, message: 'Error fetching user info.' });
    }
    
    if (results.length === 0) {
      // If no user is found, send a proper response.
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    
    // Send back the user info (in this case, just the name)
    res.json({ name: results[0].name });
  });
});

  // GET endpoint to retrieve the most recent goal for a user
app.get('/api/userGoals', (req, res) => {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Missing userId parameter.' });
    }
    
    // Fetch the latest goal for the user (ordered by goal_date descending)
    const query = `
    SELECT * FROM UserGoals 
    WHERE user_id = ? 
    ORDER BY goal_date DESC, goal_id DESC 
    LIMIT 1
    `;
    
    con.query(query, [userId], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Database error.' });
      }
      
      if (results.length > 0) {
        // Return the first (and only) result as the user's current goal.
        res.json({ goal: results[0] });
      } else {
        // No goal found. You may return a null goal or a custom message.
        res.json({ goal: null, message: 'No goal found for the specified user.' });
      }
    });
  });
  
  // POST endpoint to save a new goal for a user
  app.post('/api/userGoals', (req, res) => {
    const { user_id, exercise_goal, target_weight, target_reps, desired_bodyweight, goal_date } = req.body;
    
    // Basic validation (you can extend this as needed)
    if (!user_id || !exercise_goal || !goal_date) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }
    
    const query = `
      INSERT INTO UserGoals 
      (user_id, exercise_goal, target_weight, target_reps, desired_bodyweight, goal_date) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const queryParams = [user_id, exercise_goal, target_weight, target_reps, desired_bodyweight, goal_date];
    
    con.query(query, queryParams, (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Database error.' });
      }
      
      // Respond with the inserted record's ID or a success message.
      res.json({ success: true, message: 'Goal saved successfully.', goalId: results.insertId });
    });
  });

  // Helper function to format a Date object as YYYY-MM-DD in local time.
function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const day = ('0' + date.getDate()).slice(-2);
  return `${year}-${month}-${day}`;
}

function computeAndStoreWeeklyAverages(userId, callback) {
  
  
  const getProgressQuery = `
    SELECT bodyweight, created_at 
    FROM UserProgress 
    WHERE user_id = ?
    ORDER BY created_at ASC
  `;
    
  con.query(getProgressQuery, [userId], (err, progressResults) => {
    if (err) {
      console.error('Error fetching user progress:', err);
      return callback(err);
    }
      
    if (progressResults.length === 0) {
      console.log('No progress records found for userId:', userId);
      return callback(null, { weeklyAverages: [], currentWeek: null });
    }
      
    const firstRecordTimestamp = progressResults[0].created_at;
    const firstDate = new Date(firstRecordTimestamp);
    if (isNaN(firstDate.getTime())) {
      console.error(`Invalid date value received from created_at: ${firstRecordTimestamp}`);
      return callback(new Error("Invalid date value in user progress records."));
    }
      
    console.log(`First tracking date: ${getLocalDateString(firstDate)}`);
      
    // Group records by week.
    let weekGroups = {};
    progressResults.forEach(record => {
      const recordDate = new Date(record.created_at);
      if (isNaN(recordDate.getTime())) {
        console.error("Invalid recordDate for record:", record);
        return;
      }
      const diffDays = Math.floor((recordDate - firstDate) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.floor(diffDays / 7);

      if (!weekGroups[weekIndex]) {
        weekGroups[weekIndex] = {
          week_start_date: new Date(firstDate.getTime() + weekIndex * 7 * 24 * 60 * 60 * 1000),
          records: []
        };
      }
      weekGroups[weekIndex].records.push(record);
    });
      
  
      
    let weeks = Object.keys(weekGroups).sort((a, b) => a - b);
    let weeklyAverages = [];
      
    const processWeek = (i) => {
      if (i >= weeks.length) {
        // Determine current week info.
        let weekIndices = Object.keys(weekGroups).map(Number);
        let maxWeekIndex = Math.max(...weekIndices);
        let currentWeekCount = weekGroups[maxWeekIndex].records.length;
        return callback(null, { weeklyAverages, currentWeek: { week_index: maxWeekIndex, count: currentWeekCount } });
      }
      
      const week = weekGroups[weeks[i]];
      const weekStart = new Date(week.week_start_date);
      const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
      
      // Calculate average bodyweight for this week.
      const sum = week.records.reduce((acc, cur) => acc + parseFloat(cur.bodyweight), 0);
      const avg = sum / week.records.length;
      
      const selectQuery = `
        SELECT * FROM UserBodyweightAverages 
        WHERE user_id = ? AND week_start_date = ? AND week_end_date = ?
      `;
      con.query(selectQuery, [
        userId,
        getLocalDateString(weekStart),
        getLocalDateString(weekEnd)
      ], (err, selectResults) => {
        if (err) {
          console.error('Error checking existing weekly average:', err);
          return callback(err);
        }
          
        if (selectResults.length === 0) {
          const insertQuery = `
            INSERT INTO UserBodyweightAverages 
              (user_id, week_start_date, week_end_date, average_bodyweight) 
            VALUES (?, ?, ?, ?)
          `;
          con.query(insertQuery, [
            userId,
            getLocalDateString(weekStart),
            getLocalDateString(weekEnd),
            avg.toFixed(2)
          ], (err, result) => {
            if (err) {
              console.error('Error inserting weekly average:', err);
              return callback(err);
            }
            weeklyAverages.push({
              week_start_date: getLocalDateString(weekStart),
              week_end_date: getLocalDateString(weekEnd),
              average_bodyweight: parseFloat(avg.toFixed(2))
            });
            processWeek(i + 1);
          });
        } else {
          weeklyAverages.push({
            week_start_date: selectResults[0].week_start_date,
            week_end_date: selectResults[0].week_end_date,
            average_bodyweight: parseFloat(selectResults[0].average_bodyweight)
          });
          processWeek(i + 1);
        }
      });
    };
      
    processWeek(0);
  });
}
  
// Endpoint to get weekly bodyweight averages along with current week info.
app.get('/api/userBodyweightWeekly', (req, res) => {
  const { userId } = req.query;
  console.log(`GET /api/userBodyweightWeekly called for userId: ${userId}`);
  if (!userId) {
    console.error('Missing userId parameter.');
    return res.status(400).json({ success: false, message: 'Missing userId parameter.' });
  }
    
  computeAndStoreWeeklyAverages(userId, (err, resultObj) => {
    if (err) {
      console.error('Error computing weekly averages:', err);
      return res.status(500).json({ success: false, message: 'Error computing weekly averages.' });
    }
      
    const { weeklyAverages, currentWeek } = resultObj;
    weeklyAverages.sort((a, b) => new Date(a.week_start_date) - new Date(b.week_start_date));
    res.json({ weeklyAverages, currentWeek });
  });
});

  // Set the storage engine for Multer
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Save files in the "public/videos" directory
    cb(null, path.join(__dirname, 'public/videos'));
  },
  filename: function(req, file, cb) {
    // Save file with the exercise name and original extension.
    // Optionally, you can append a timestamp to make file names unique.
    const exercise = req.body.exercise;
    const ext = path.extname(file.originalname);
    cb(null, exercise + ext);
  }
});

// Initialize upload middleware with storage settings
const upload = multer({ storage: storage });

/*
 * GET /get-tutorial-videos
 *
 * Retrieve all tutorial videos from the database and send a JSON mapping.
 */
app.get('/get-tutorial-videos', (req, res) => {
  const sql = "SELECT exercise, videoUrl FROM tutorial_videos";
  con.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error fetching data');
      return;
    }
    // Build a mapping object from the query result.
    const videoMapping = {};
    result.forEach(row => {
      videoMapping[row.exercise] = row.videoUrl;
    });
    res.json({ videoMapping: videoMapping });
  });
});

/*
 * POST /upload-video
 *
 * Process the uploaded video and update the database.
 */
app.post('/upload-video', upload.single('video'), (req, res) => {
  const exercise = req.body.exercise;
  
  if (!req.file) {
    res.status(400).json({ success: false, message: "No file uploaded" });
    return;
  }
  
  // Construct the video URL (relative to the public folder)
  const videoUrl = '/videos/' + req.file.filename;
  
  // Insert new record or update existing record using ON DUPLICATE KEY UPDATE.
  const sql = `
    INSERT INTO tutorial_videos (exercise, videoUrl) VALUES (?, ?)
    ON DUPLICATE KEY UPDATE videoUrl = ?
  `;
  con.query(sql, [exercise, videoUrl, videoUrl], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error saving video info" });
      return;
    }
    res.json({ success: true, videoUrl: videoUrl });
  });
});

// New endpoint to return every bodyweight record for a user.
app.get('/api/userBodyweights', (req, res) => {
  const { userId } = req.query;
  console.log(`GET /api/userBodyweights called for userId: ${userId}`);
  if (!userId) {
    console.error('Missing userId parameter.');
    return res.status(400).json({ success: false, message: 'Missing userId parameter.' });
  }
  
  const query = `
    SELECT bodyweight, created_at 
    FROM UserProgress 
    WHERE user_id = ? 
    ORDER BY created_at ASC
  `;
  
  con.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching bodyweight records:', err);
      return res.status(500).json({ success: false, message: 'Error fetching bodyweight records.' });
    }
    console.log('Fetched bodyweight records:', results);
    res.json({ bodyweights: results });
  });
});

/*
 * GET /get-progress-photos
 *
 * Expects query parameters: userId and view.
 * Retrieves all photo paths for the specified user and view from the database.
 */
// Storage configuration for progress photos
// Configure storage for progress photos
// Configure storage for progress photos
const photoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Retrieve userId and view from the request.
    const userId = req.body.userId;
    const view = req.body.view; // expected values: "front", "rear", "side"
    
    // Build the user folder and view folder paths
    const userFolder = path.join(__dirname, 'public', 'photos', `user_id=${userId}`);
    const viewFolder = path.join(userFolder, `user_id=${userId}_${view}`);
    
    // Create the directories recursively if they do not exist
    fs.mkdir(viewFolder, { recursive: true }, (err) => {
      if (err) {
        return cb(err);
      }
      cb(null, viewFolder);
    });
  },
  filename: function (req, file, cb) {
    // Generate a unique filename while preserving the original extension.
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Create an instance of multer using the custom storage.
const uploadPhoto = multer({ storage: photoStorage });

app.get('/get-progress-photos', (req, res) => {
  const { userId, view } = req.query;
  if (!userId || !view) {
    return res.status(400).send('Missing userId or view parameter.');
  }
  const sql = "SELECT photo_path FROM progress_photos WHERE user_id = ? AND view = ?";
  con.query(sql, [userId, view], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error fetching progress photos');
    }
    const photos = results.map(row => row.photo_path);
    res.json({ photos: photos });
  });
});

app.post('/upload-progress-photo', uploadPhoto.single('photo'), (req, res) => {
  // Retrieve userId and view from the request body
  const { userId, view } = req.body;
  
  if (!userId || !view) {
    return res.status(400).json({ success: false, message: "Missing userId or view." });
  }
  
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }
  
  // Construct the photo URL according to the folder structure.
  // For example: /photos/user_id=2/user_id=2_front/filename.jpg
  const photoPath = `/photos/user_id=${userId}/user_id=${userId}_${view}/${req.file.filename}`;
  
  const sql = "INSERT INTO progress_photos (user_id, view, photo_path) VALUES (?, ?, ?)";
  con.query(sql, [userId, view, photoPath], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Error saving photo info" });
    }
    res.json({ success: true, photoPath: photoPath });
  });
});

function parseSetData(setStr) {
  console.log("Parsing set data:", setStr);
  if (!setStr) return null;
  const trimmed = setStr.trim();
  if (trimmed === '-' || trimmed === '') return null;
  
  // Remove "kg" (case-insensitive) and split by '/'
  const cleaned = trimmed.replace(/kg/gi, '');
  const parts = cleaned.split('/');
  if (parts.length < 2) return null;
  
  const reps = parseInt(parts[0].trim(), 10);
  const weight = parseFloat(parts[1].trim());
  if (isNaN(reps) || isNaN(weight)) return null;
  
  console.log("Parsed values:", { reps, weight });
  return { reps, weight };
}

// ------------------
// Backend Endpoint: /api/userExerciseWeekly
// ------------------
app.get('/api/userExerciseWeekly', (req, res) => {
  const { userId, exercise } = req.query;
  console.log(`Received request for userId: ${userId} and exercise: ${exercise}`);
  
  if (!userId || !exercise) {
    console.error("Missing parameters:", { userId, exercise });
    return res.status(400).json({ 
      success: false, 
      message: 'Missing userId or exercise parameter.' 
    });
  }

  // Normalize the exercise parameter.
  // E.g. convert "bench_press" to "bench press"
  const normalizedExercise = exercise.replace(/_/g, ' ').toLowerCase();
  console.log("Normalized exercise to search for:", normalizedExercise);

  // Query all progress records for this user, ordered by created_at
  const query = "SELECT plan_json, created_at FROM UserProgress WHERE user_id = ? ORDER BY created_at ASC";
  console.log("Executing query:", query, "with userId:", userId);
  
  con.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching user progress:", err);
      return res.status(500).json({ success: false, message: 'Database error.' });
    }
    
    console.log(`Fetched ${results.length} records for user ${userId}`);
    if (results.length === 0) {
      return res.status(200).json({ averageReps: 0, averageWeight: 0 });
    }

    // Initialize totals for all matching records
    let totalReps = 0, totalWeight = 0, totalSets = 0;

    // Loop over each record
    results.forEach(record => {
      let plan;
      try {
        plan = JSON.parse(record.plan_json);
      } catch(e) {
        console.error("Error parsing plan_json:", e, "Skipping record.");
        return; // skip this record
      }
      
      if (!plan.headers || !Array.isArray(plan.headers)) {
        console.warn("No valid headers found in plan_json", plan);
        return;
      }

      // Find the index of the target exercise (normalized, case-insensitive match)
      let exIndex = plan.headers.findIndex(h => h.toLowerCase() === normalizedExercise);
      if (exIndex === -1) {
        console.log(`Exercise "${normalizedExercise}" not found in headers:`, plan.headers);
        return;  // Exercise not found in this record
      }

      if (!plan.rows || !Array.isArray(plan.rows)) return;
      
      plan.rows.forEach(row => {
        if (!row.data || !Array.isArray(row.data)) return;
        let setDataStr = row.data[exIndex];
        // parseSetData is your helper that converts a string like "10/100kg" into an object { reps, weight }
        const parsed = parseSetData(setDataStr);
        if (parsed) {
          totalReps += parsed.reps;
          totalWeight += parsed.weight;
          totalSets++;
          console.log("Added set data:", parsed, "Total sets so far:", totalSets);
        }
      });
    });

    console.log("Totals computed for exercise:", { totalReps, totalWeight, totalSets });
    if (totalSets === 0) {
      console.warn("No valid set data found for the exercise.");
      return res.status(200).json({ averageReps: 0, averageWeight: 0 });
    }

    let averageReps = totalReps / totalSets;
    let averageWeight = totalWeight / totalSets;
    console.log("Returning averages:", { averageReps, averageWeight });
    return res.json({ averageReps, averageWeight });
  });
});

// ← add this new route to your Express backend:
app.get('/api/getWorkoutPlansByDate', (req, res) => {
  const { user_id, date } = req.query;
  if (!user_id || !date) {
    return res.status(400).json({ success: false, message: 'Missing user_id or date' });
  }

  const sql = `
    SELECT routine, day, plan_json
    FROM WorkoutPlans
    WHERE user_id = ? AND DATE(created_at) = ?
    ORDER BY updated_at DESC
  `;
  con.query(sql, [user_id, date], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });

    const plans = results.map(r => ({
      routine:    r.routine,
      day:        r.day,
      plan_json:  JSON.parse(r.plan_json)
    }));
    res.json({ success: true, plans });
  });
});