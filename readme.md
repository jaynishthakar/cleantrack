CleanTrack – Complaint Management System

A full-stack municipal grievance redressal platform

 Overview

CleanTrack is a full-stack, database-driven complaint management system designed to help citizens report municipal issues and enable authorities to efficiently track, assign, and resolve them.

The platform supports:

Consumer (citizen) accounts

Authority (municipal officer) accounts

Complaint filing, assignment, completion with proof

Notifications, comments, and feedback

Automatic logging of deleted complaints using triggers

A clean, modern UI with role-based dashboards

CleanTrack demonstrates practical application of DBMS concepts, including triggers, views, subqueries, transaction handling, and relational schema design.

 Features
 Consumer Features

Login and signup

File new complaints

View status updates (Pending / Assigned / Completed)

See proof of completion

Submit feedback and rating

View notifications

Interact via comments on nearby complaints

Delete complaints (handled by database trigger)

 Authority Features

View all relevant complaints grouped by status

Assign complaints to self

Mark complaints as completed with proof image upload

View feedback from consumers

View full comment threads

Receive notifications automatically

 Database Features

Normalized relational schema

Foreign key mapping

Trigger: complaint deletion gets logged in DeletedComplaints

View: Active complaints view

Subquery usage in dashboard analytics

Automatic timestamps

Tech Stack
Frontend:

HTML5

CSS3 (Bootstrap + custom styling)

JavaScript (ES6)

Bootstrap Icons

🔹 Backend

Node.js

Express.js

Multer (file upload)

dotenv (environment variables)

🔹 Database

MySQL

mysql2 library (Node.js connector)

Relational schema

Triggers, Views, Subqueries

📁 Project Structure
CleanTrack/
│
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── routes/
│   │    ├── auth.js
│   │    └── complaints.js
│   ├── uploads/
│   └── .env
│
├── frontend/
│   ├── index.html
│   ├── dashboard.html
│   ├── css/style.css
│   ├── images/cleantrack.jpg
│   └── js/
│       ├── main.js
│       └── dashboard.js
│
└── README.md

 Installation & Setup
1️ Clone the repository
git clone https://github.com/USERNAME/CLEANTRACK-REPO.git
cd CLEANTRACK-REPO

2️ Backend Setup
Install dependencies
cd backend
npm install

Create .env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=dbms_project

Start backend server
npm start


Backend runs at:

http://127.0.0.1:5000

3️ Frontend Setup

No build process needed.

Simply open:

frontend/index.html


in your browser.

 Database Schema Overview
 Important Tables

Consumer

Authority

Complaint

ComplaintProofs

Comment

Feedback

Notification

DeletedComplaints (trigger logs deleted complaints)

 Trigger Implemented
CREATE TRIGGER complaint_delete_trigger
AFTER DELETE ON Complaint
FOR EACH ROW
BEGIN
    INSERT INTO DeletedComplaints (...);
    INSERT INTO Notification (...);
END;

 View Implemented
CREATE VIEW active_complaints_view AS
SELECT ...
FROM Complaint
WHERE status = 'Pending';

 Example Subquery

Used to fetch complaints that have feedback OR comments.

 API Endpoints (Summary)
🔹 Authentication
Method	Route	Description
POST	/api/auth/signup	Register consumer/authority
POST	/api/auth/login	Login
🔹 Complaints
Method	Route	Description
POST	/api/complaints/	File complaint
GET	/api/complaints/consumer/:id	Get consumer complaints
GET	/api/complaints/authority/:id	Get authority complaints
POST	/api/complaints/assign/:complaint_id/:authority_id	Assign complaint
POST	/api/complaints/complete/:id	Mark completed with proof
DELETE	/api/complaints/delete/:complaint_id/:consumer_id	Delete complaint
🔹 Interactions
Method	Route	Description
GET	/api/complaints/comments/:id	Load comments
POST	/api/complaints/comment	Add comment
POST	/api/complaints/feedback	Submit feedback
GET	/api/complaints/notifications/:role/:id	Fetch notifications


🤝 Contributing

Pull requests are welcome!
For major changes, please open an issue first to discuss the proposal.


❤️ Acknowledgements

Special thanks to:

Bootstrap

Node.js

MySQL

