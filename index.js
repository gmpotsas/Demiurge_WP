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
                return res.json({ success: true, plan, updated_at: plan.updated_at ,day : plan.day});
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
      res.json({ table: planData, day: row.day });
    } else {
      res.status(404).json({ success: false, message: 'No records found for the specified day.' });
    }
  });
});
  
// POST endpoint to save or update user progress
app.post('/api/userprogress', (req, res) => {
    const { user_id, routine, day, date, table } = req.body;
    if (!user_id || !routine || !day || !date || !table) {
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
            "UPDATE UserProgress SET routine = ?, day = ?, plan_json = ?, rest = ? WHERE user_id = ? AND DATE(created_at) = ?",
            [routine, day,  planJson, rest, user_id, formattedDate.split(' ')[0]],
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
            "INSERT INTO UserProgress (user_id, routine, day, plan_json, created_at, rest) VALUES (?, ?, ?, ?, ?, ?)",
            [user_id, routine, day, planJson, formattedDate, rest],
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
    // 👉 use snake_case to match the JSON your stats.js is sending:
    const {
      user_id,
      exercise_goal,
      target_weight,
      target_reps,
      desired_bodyweight
    } = req.body;
  
    if (!user_id || desired_bodyweight == null) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields.'
      });
    }
  
    // 1) Insert the new goal
    const insertSql = `
      INSERT INTO UserGoals 
        (user_id, exercise_goal, target_weight, target_reps, desired_bodyweight) 
      VALUES (?, ?, ?, ?, ?)
    `;
    con.query(
      insertSql,
      [user_id, exercise_goal, target_weight, target_reps, desired_bodyweight],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({
            success: false,
            message: 'DB error on inserting goal.'
          });
        }
  
        const newGoalId = result.insertId;
  
        // 2) Find most recent progress timestamp (to reset anchor_date)
        const progSql = `
          SELECT created_at 
          FROM UserProgress 
          WHERE user_id = ? 
          ORDER BY created_at DESC 
          LIMIT 1
        `;
        con.query(progSql, [user_id], (err2, progRows) => {
          if (err2) {
            console.error(err2);
            // goal inserted, but anchor reset failed – still return success
            return res.json({ success: true, goal_id: newGoalId });
          }
  
          if (!progRows.length) {
            // no progress yet → leave anchor_date NULL
            return res.json({ success: true, goal_id: newGoalId });
          }
  
          // 3) Update anchor_date on the newly inserted goal
          const anchorDate = progRows[0].created_at;
          const updateSql = `
            UPDATE UserGoals 
            SET anchor_date = ? 
            WHERE goal_id = ?
          `;
          con.query(updateSql, [anchorDate, newGoalId], err3 => {
            if (err3) console.error('Failed to update anchor_date:', err3);
            return res.json({ success: true, goal_id: newGoalId });
          });
        });
      }
    );
  });
  



app.get('/api/userBodyweightWeekly', (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ success: false, message: 'Missing userId.' });
  }

  // Helper to bucket and average once we know anchorDate
  function computeAndSend(anchorDate) {
    const fetchSql = `
      SELECT created_at, bodyweight 
      FROM UserProgress 
      WHERE user_id = ? 
        AND created_at >= ? 
      ORDER BY created_at ASC
    `;
    con.query(fetchSql, [userId, anchorDate], (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'DB error fetching progress.' });
      }

      // bucket into weeks since anchorDate
      const start = new Date(anchorDate).getTime();
      const weekBuckets = {};
      rows.forEach(r => {
        const wk = Math.floor((new Date(r.created_at).getTime() - start) / (7*24*60*60*1000));
        weekBuckets[wk] = weekBuckets[wk] || [];
        weekBuckets[wk].push(r.bodyweight);
      });

      const weeklyAverages = [];
      let currentWeek = null;
      Object.keys(weekBuckets).map(Number).sort((a,b)=>a-b).forEach(wk => {
        const vals = weekBuckets[wk];
        if (vals.length >= 7) {
          const avg = vals.reduce((sum, v) => sum + v, 0) / vals.length;
          weeklyAverages.push({ week_index: wk, average_bodyweight: avg });
        } else {
          currentWeek = { week_index: wk, count: vals.length };
        }
      });

      const startingBodyweight = rows.length ? rows[0].bodyweight : null;
      return res.json({ startingBodyweight, weeklyAverages, currentWeek });
    });
  }

  // 1) get the latest goal to find anchor_date
  const goalSql = `
    SELECT desired_bodyweight, anchor_date 
    FROM UserGoals 
    WHERE user_id = ? 
    ORDER BY goal_date DESC, goal_id DESC 
    LIMIT 1
  `;
  con.query(goalSql, [userId], (err, goalRows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'DB error fetching goal.' });
    }

    let anchorDate = goalRows[0] && goalRows[0].anchor_date;
    if (anchorDate) {
      return computeAndSend(anchorDate);
    }

    // 2) if no anchor_date, use the first-ever progress entry
    const firstSql = `
      SELECT created_at 
      FROM UserProgress 
      WHERE user_id = ? 
      ORDER BY created_at ASC 
      LIMIT 1
    `;
    con.query(firstSql, [userId], (err2, firstRows) => {
      if (err2) {
        console.error(err2);
        return res.status(500).json({ success: false, message: 'DB error fetching first progress.' });
      }
      if (!firstRows.length) {
        // no progress at all
        return res.json({ startingBodyweight: null, weeklyAverages: [], currentWeek: null });
      }
      anchorDate = firstRows[0].created_at;
      computeAndSend(anchorDate);
    });
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



// POST /api/userprogress/bodyweight
app.post('/api/userprogress/bodyweight', (req, res) => {
  const { user_id, date, bodyweight } = req.body;
  if (!user_id || !date || !bodyweight) {
    return res.status(400).json({ success:false, message: 'Missing fields.' });
  }

  // Check if there’s already a record for that day:
  con.query(
    `SELECT * FROM UserProgress WHERE user_id=? AND DATE(created_at)=?`,
    [user_id, date],
    (err, results) => {
      if (err) return res.status(500).json({ success:false, message:'DB error.' });

      if (results.length) {
        // UPDATE only bodyweight
        con.query(
          `UPDATE UserProgress
             SET bodyweight=?
           WHERE user_id=? AND DATE(created_at)=?`,
          [bodyweight, user_id, date],
          err => err
            ? res.status(500).json({ success:false, message:'DB error.' })
            : res.json({ success:true, message:'Bodyweight updated.' })
        );
      } else {
        // INSERT a new row; you can leave plan_json NULL or empty JSON
        con.query(
          `INSERT INTO UserProgress
             (user_id, created_at, bodyweight, plan_json, rest)
           VALUES (?, ?, ?, ?, ?)`,
          [user_id, `${date} 00:00:00`, bodyweight, JSON.stringify({}), false],
          err => err
            ? res.status(500).json({ success:false, message:'DB error.' })
            : res.json({ success:true, message:'Bodyweight recorded.' })
        );
      }
    }

    
  );
});
