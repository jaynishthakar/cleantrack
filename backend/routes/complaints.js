import express from "express";
import multer from "multer";
import path from "path";
import db from "../db.js";

const router = express.Router();

// ---------- MULTER SETUP ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// --- HELPER FUNCTION: INSERT NOTIFICATION ---
function insertNotification(consumerID, authority_id, message) {
    const sql = `
        INSERT INTO Notification (consumerID, authority_id, message)
        VALUES (?, ?, ?)`;
    db.query(sql, [consumerID, authority_id, message], (err) => {
        if (err) console.error("Notification failed to insert:", err.message);
    });
}

// ---------- CONSUMER COMPLAINTS ----------
router.get("/consumer/:id", (req, res) => {
  const sql = `
    SELECT c.*, a.officer_name AS authority_name
    FROM Complaint c
    LEFT JOIN Authority a ON c.authority_id = a.authority_id
    WHERE c.consumer_id = ?
    ORDER BY c.dataposted DESC`;
  db.query(sql, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ---------- AUTHORITY COMPLAINTS (Show all relevant complaints) ----------
router.get("/authority/:id", (req, res) => {
  const sql = `
    SELECT c.*, con.Name AS consumer_name
    FROM Complaint c
    LEFT JOIN Consumer con ON c.consumer_id = con.consumer_id
    ORDER BY FIELD(c.status,'Pending','Assigned','Completed'), c.dataposted DESC`;
  db.query(sql, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ---------- ASSIGN COMPLAINT ----------
router.post("/assign/:complaint_id/:authority_id", (req, res) => {
  const { complaint_id, authority_id } = req.params;
  const sql = `
    UPDATE Complaint
    SET authority_id=?, status='Assigned'
    WHERE complaint_id=? AND status='Pending'`;
    
  db.query(sql, [authority_id, complaint_id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(400).json({ message: "Complaint not found or already assigned." });

    // Find consumer_id for notification
    db.query("SELECT consumer_id FROM Complaint WHERE complaint_id=?", [complaint_id], (err2, rows) => {
        if (!err2 && rows.length > 0) {
            // ✅ Notify Consumer
            insertNotification(rows[0].consumer_id, null, `Your complaint #${complaint_id} has been assigned.`);
        }
    });

    res.json({ message: "Complaint assigned successfully!" });
  });
});

// ---------- COMPLETE COMPLAINT ----------
router.post("/complete/:id", upload.single("proof_image"), (req, res) => {
  const complaint_id = req.params.id;
  const { ngo_name } = req.body;
  const file_path = `/uploads/${req.file.filename}`;
  
  // Find consumer_id and authority_id before updating the status
  db.query("SELECT consumer_id, authority_id FROM Complaint WHERE complaint_id=?", [complaint_id], (err0, rows) => {
      if (err0 || rows.length === 0) return res.status(500).json({ error: "Complaint not found." });
      const { consumer_id, authority_id } = rows[0];

      const updateSql = `UPDATE Complaint SET status='Completed' WHERE complaint_id=?`;
      db.query(updateSql, [complaint_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        const proofSql = `
          INSERT INTO ComplaintProofs (complaint_id,file_path,file_type,ngo_name,verified)
          VALUES (?,?,?,?,TRUE)`;
        db.query(proofSql, [complaint_id, file_path, "image", ngo_name], (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });
          
          // ✅ Notify Consumer
          insertNotification(consumer_id, null, `Complaint #${complaint_id} completed! View proof and leave feedback.`);
          
          res.json({ message: "Complaint marked as completed successfully!" });
        });
      });
  });
});

// ---------- GET PROOF ----------
router.get("/proof/:id", (req, res) => {
  const sql = `
    SELECT cp.file_path, cp.ngo_name, c.status
    FROM ComplaintProofs cp
    JOIN Complaint c ON cp.complaint_id=c.complaint_id
    WHERE cp.complaint_id=?`;
  db.query(sql, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows[0] || {});
  });
});

// ---------- FILE NEW COMPLAINT ----------
router.post("/", (req, res) => {
  const { consumer_id, locality_id, description } = req.body;
  const sql = `
    INSERT INTO Complaint (consumer_id,locality_id,description,status)
    VALUES (?,?,?,'Pending')`;
  db.query(sql, [consumer_id, locality_id, description], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // NOTE: Need logic here to find the authority associated with locality_id and notify them.
    // For simplicity now, we'll skip the Authority notification on new complaint, 
    // but the framework is set up.

    res.json({ message: "Complaint submitted successfully!" });
  });
});

// ---------- FEEDBACK CHECK (Consumer) ----------
router.get("/feedback/check/:complaint_id/:consumer_id", (req, res) => {
  const { complaint_id, consumer_id } = req.params;
  const sql =
    "SELECT 1 FROM Feedback WHERE complaint_id=? AND consumer_id=?";
  db.query(sql, [complaint_id, consumer_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ exists: rows.length > 0 }); 
  });
});

// ---------- FEEDBACK SUBMISSION (Consumer) ----------
router.post("/feedback", (req, res) => {
  const { consumer_id, complaint_id, rating, review } = req.body;
  
  const checkSql = "SELECT * FROM Feedback WHERE consumer_id=? AND complaint_id=?";
  db.query(checkSql, [consumer_id, complaint_id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length > 0)
      return res.status(400).json({ message: "Feedback already submitted for this complaint." });

    const sql = `
      INSERT INTO Feedback (consumer_id,complaint_id,Rating,Review_Test)
      VALUES (?,?,?,?)`;
    db.query(sql, [consumer_id, complaint_id, rating, review], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });

      // Find authority_id for notification
      db.query("SELECT authority_id FROM Complaint WHERE complaint_id=?", [complaint_id], (err3, rows) => {
          if (!err3 && rows.length > 0 && rows[0].authority_id) {
              // ✅ Notify Authority
              insertNotification(null, rows[0].authority_id, `New feedback received for complaint #${complaint_id}.`);
          }
      });
      
      res.json({ message: "Feedback submitted successfully!" });
    });
  });
});

// ---------- GET FEEDBACK FOR AUTHORITY (Authority View) ----------
router.get("/feedback/authority/:id", (req, res) => {
  const sql = `
    SELECT f.*, c.complaint_id, con.Name AS consumer_name
    FROM Feedback f
    JOIN Complaint c ON f.complaint_id=c.complaint_id
    JOIN Consumer con ON f.consumer_id=con.consumer_id
    WHERE c.authority_id=?`; 
  db.query(sql, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ---------- COMMENTS (Post) ----------
router.post("/comment", (req, res) => {
  const { consumer_id, complaint_id, comment_text } = req.body;
  const sql = `
    INSERT INTO Comment (consumer_id,complaint_id,comment_text)
    VALUES (?,?,?)`;
  db.query(sql, [consumer_id, complaint_id, comment_text], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Comment added successfully!" });
  });
});

// ---------- COMMENTS (Get) ----------
router.get("/comments/:id", (req, res) => {
  const sql = `
    SELECT cm.comment_text, cm.created_at, con.Name AS commenter_name
    FROM Comment cm
    JOIN Consumer con ON cm.consumer_id=con.consumer_id
    WHERE cm.complaint_id=?
    ORDER BY cm.created_at DESC`;
  db.query(sql, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ---------- NEARBY COMPLAINTS (Consumer View) ----------
router.get("/nearby/:locality_id/:consumer_id", (req, res) => {
  const { locality_id, consumer_id } = req.params;
  const sql = `
    SELECT c.*, con.Name AS consumer_name
    FROM Complaint c
    JOIN Consumer con ON c.consumer_id=con.consumer_id
    WHERE c.locality_id=? AND c.consumer_id<>?
    ORDER BY c.dataposted DESC`;
  db.query(sql, [locality_id, consumer_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ---------- GET NOTIFICATIONS (New Route) ----------
router.get("/notifications/:role/:id", (req, res) => {
  const { role, id } = req.params;
  let sql;
  let params;
  
  if (role === 'consumer') {
    sql = `
      SELECT NotificationID, message, sent_at
      FROM Notification
      WHERE consumerID = ?
      ORDER BY sent_at DESC
      LIMIT 10`;
    params = [id];
    
  } else if (role === 'authority') {
    sql = `
      SELECT NotificationID, message, sent_at
      FROM Notification
      WHERE authority_id = ?
      ORDER BY sent_at DESC
      LIMIT 10`;
    params = [id];
  } else {
    return res.status(400).json({ error: "Invalid role specified." });
  }

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});


// DELETE COMPLAINT (Consumer can delete own complaint)

router.delete("/delete/:complaint_id/:consumer_id", (req, res) => {
  const { complaint_id, consumer_id } = req.params;

  const sql = `DELETE FROM Complaint WHERE complaint_id=? AND consumer_id=?`;

  db.query(sql, [complaint_id, consumer_id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    if (result.affectedRows === 0) {
      return res.status(400).json({ message: "Complaint not found or unauthorized delete attempt." });
    }

    res.json({ message: "Complaint deleted successfully!" });
  });
});
// ---------------------------------------------
// GET Deleted Complaints (History)
// ---------------------------------------------
router.get("/history/:consumer_id", (req, res) => {
  const { consumer_id } = req.params;

  const sql = `
    SELECT complaint_id, description, deleted_at
    FROM ComplaintHistory
    WHERE consumer_id = ?
    ORDER BY deleted_at DESC
  `;

  db.query(sql, [consumer_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});


export default router;