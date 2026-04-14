# To-Do List Web Application - Assignment 4

A full-stack web application with authentication, role-based access control (RBAC), and multi-object CRUD operations. Built with MVC architecture, JWT authentication, and MongoDB.

## Project Overview

This application allows users to manage to-do items organized by categories. It features:
- **User Authentication**: Secure login/registration with JWT tokens
- **Role-Based Access Control**: Admin and User roles with different permissions
- **Two Main Objects**: ToDos (Primary) and Categories (Secondary)
- **MVC Architecture**: Clean separation of Models, Views, Controllers, and Middleware

## What This Project Does

### For All Users:
- View all to-do items (read-only)
- View all categories (read-only)
- Register and login to the system

### For Admin Users Only:
- Create, update, and delete to-do items
- Create, update, and delete categories
- Full CRUD access to all resources

## Project Architecture (MVC Pattern)

The project follows industry-standard MVC architecture:

```
TO-DO WEB/
├── backend/
│   ├── models/              # MongoDB/Mongoose schemas
│   │   ├── UserModel.js     # User schema (email, password, role)
│   │   ├── ToDoModel.js     # ToDo schema (primary object)
│   │   └── CategoryModel.js # Category schema (secondary object)
│   ├── controllers/         # Business logic
│   │   ├── AuthController.js
│   │   ├── ToDoController.js
│   │   └── CategoryController.js
│   ├── routes/              # API endpoints
│   │   ├── AuthRoute.js
│   │   ├── ToDoRoute.js
│   │   └── CategoryRoute.js
│   ├── middleware/          # Authentication & error handling
│   │   ├── auth.js          # JWT authentication & RBAC
│   │   └── errorHandler.js  # Error logging
│   ├── Server.js            # Main server file
│   └── package.json
│
└── frontend/                # Client-side code
    ├── index.html
    ├── styles.css
    └── app.js
```

## Two Objects Explained

### 1. Primary Object: ToDo
**Purpose**: Main task management entity

**Fields**:
- `title` (String, required) - Task name
- `description` (String, required) - Task details
- `priority` (Enum: Low, Medium, High, required)
- `status` (Enum: Pending, In Progress, Completed)
- `category` (ObjectId, required) - Reference to Category
- `createdAt`, `updatedAt` (automatic timestamps)

**CRUD Operations**:
- GET `/api/todos` - View all (Public)
- GET `/api/todos/:id` - View one (Public)
- POST `/api/todos` - Create (Admin only)
- PUT `/api/todos/:id` - Update (Admin only)
- DELETE `/api/todos/:id` - Delete (Admin only)

### 2. Secondary Object: Category
**Purpose**: Organize todos into groups (e.g., Work, Study, Personal)

**Fields**:
- `name` (String, required, unique) - Category name
- `description` (String, required) - Category description
- `color` (String) - Display color
- `createdAt`, `updatedAt` (automatic timestamps)

**CRUD Operations**:
- GET `/api/categories` - View all (Public)
- GET `/api/categories/:id` - View one (Public)
- POST `/api/categories` - Create (Admin only)
- PUT `/api/categories/:id` - Update (Admin only)
- DELETE `/api/categories/:id` - Delete (Admin only)

## Authentication & Security

### User Registration & Login
- Users register with email and password
- Passwords are hashed using bcrypt (never stored in plain text)
- JWT tokens are issued upon successful login/registration
- Tokens expire after 7 days

### Role-Based Access Control (RBAC)

**User Role** (`user`):
- Can view todos and categories (GET requests)
- Cannot create, update, or delete anything

**Admin Role** (`admin`):
- Can view todos and categories (GET requests)
- Can create, update, and delete todos (POST, PUT, DELETE)
- Can create, update, and delete categories (POST, PUT, DELETE)

### Security Features
- Password hashing with bcrypt (10 salt rounds)
- JWT token-based authentication
- Protected routes with middleware
- Role-based authorization checks
- Input validation on all endpoints
- Error handling and logging

## Setup Instructions

### Prerequisites
1. **Node.js** (version 14 or higher)
2. **MongoDB Atlas** account (free tier works) or local MongoDB
3. Code editor (VS Code recommended)

### Step 1: MongoDB Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account and cluster
3. Create a database user (remember credentials!)
4. Whitelist your IP (or use 0.0.0.0/0 for testing)
5. Get your connection string

### Step 2: Backend Configuration

1. Navigate to the `backend` folder
2. Create a `.env` file with:
   ```
   MONGODB_URL=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/tododb?retryWrites=true&w=majority
   PORT=5000
   JWT_SECRET=your-secret-key-here-change-in-production
   ```
   **Important**: Replace with your actual MongoDB credentials and use a strong JWT_SECRET!

3. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

4. Start the server:
   ```bash
   npm start
   # or with nodemon
   nodemon Server.js
   ```

### Step 3: Access the Application

1. Open browser to `http://localhost:5000`
2. Register a new account (choose "admin" role for full access)
3. Login with your credentials
4. Start managing todos and categories!

## How Roles Are Handled

### Registration
When registering, users can choose their role:
- **User**: Limited to viewing only
- **Admin**: Full CRUD access

**Note**: In production, you might want to restrict role selection to prevent unauthorized admin creation.

### Authentication Flow
1. User registers/logs in → receives JWT token
2. Token stored in browser localStorage
3. Token sent in `Authorization: Bearer <token>` header for protected routes
4. Middleware verifies token and extracts user info
5. Authorization middleware checks user role
6. Request proceeds if authorized, otherwise returns 403 Forbidden

### Access Control Implementation

**Public Routes** (No authentication required):
- `GET /api/todos` - View all todos
- `GET /api/todos/:id` - View single todo
- `GET /api/categories` - View all categories
- `GET /api/categories/:id` - View single category
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

**Protected Routes** (Require authentication + admin role):
- `POST /api/todos` - Create todo
- `PUT /api/todos/:id` - Update todo
- `DELETE /api/todos/:id` - Delete todo
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "role": "admin" // or "user"
  }
  ```

- `POST /api/auth/login` - Login user
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

- `GET /api/auth/me` - Get current user (requires auth token)

### ToDos
- `GET /api/todos` - Get all todos (Public)
- `GET /api/todos/:id` - Get single todo (Public)
- `POST /api/todos` - Create todo (Admin only, requires token)
- `PUT /api/todos/:id` - Update todo (Admin only, requires token)
- `DELETE /api/todos/:id` - Delete todo (Admin only, requires token)

### Categories
- `GET /api/categories` - Get all categories (Public)
- `GET /api/categories/:id` - Get single category (Public)
- `POST /api/categories` - Create category (Admin only, requires token)
- `PUT /api/categories/:id` - Update category (Admin only, requires token)
- `DELETE /api/categories/:id` - Delete category (Admin only, requires token)

## Testing with Postman

### Testing Public Access (No Token)
1. `GET /api/todos` - Should work (200 OK)
2. `GET /api/categories` - Should work (200 OK)

### Testing User Role (Regular User Token)
1. Register/login as "user" role
2. Copy the JWT token from response
3. Add header: `Authorization: Bearer <token>`
4. `GET /api/todos` - Should work (200 OK)
5. `POST /api/todos` - Should fail (403 Forbidden - Admin only)
6. `DELETE /api/todos/:id` - Should fail (403 Forbidden - Admin only)

### Testing Admin Role (Admin Token)
1. Register/login as "admin" role
2. Copy the JWT token from response
3. Add header: `Authorization: Bearer <token>`
4. `GET /api/todos` - Should work (200 OK)
5. `POST /api/todos` - Should work (201 Created)
6. `PUT /api/todos/:id` - Should work (200 OK)
7. `DELETE /api/todos/:id` - Should work (200 OK)

## Technologies Used

- **Backend**:
  - Node.js & Express.js
  - MongoDB & Mongoose
  - JWT (jsonwebtoken) for authentication
  - bcrypt for password hashing
  - CORS for cross-origin requests

- **Frontend**:
  - HTML5, CSS3
  - Vanilla JavaScript (no frameworks)
  - LocalStorage for token management

- **Database**: MongoDB (via MongoDB Atlas)

## Features

✅ MVC Architecture  
✅ JWT Authentication  
✅ Role-Based Access Control (RBAC)  
✅ Password Hashing (bcrypt)  
✅ Two-Object CRUD (ToDos & Categories)  
✅ Input Validation  
✅ Error Handling & Logging  
✅ Responsive Design  
✅ Modern UI/UX  

## Troubleshooting

### "Access denied" errors
- Make sure you're logged in (token in localStorage)
- Verify your role is "admin" for POST/PUT/DELETE operations
- Check that token is sent in Authorization header

### Can't create todos/categories
- Only admin users can create/update/delete
- Register with "admin" role or login as admin
- Check browser console for error messages

### Token expired
- Tokens expire after 7 days
- Simply login again to get a new token

### MongoDB connection issues
- Verify `.env` file has correct MONGODB_URL
- Check IP whitelist in MongoDB Atlas
- Ensure database user credentials are correct

## Assignment 4 Requirements Checklist

✅ **MVC Architecture**: Code organized into models/, routes/, controllers/, middleware/  
✅ **Two Objects**: ToDo (primary) and Category (secondary) with full CRUD  
✅ **Authentication**: User registration/login with JWT  
✅ **Password Hashing**: bcrypt implementation  
✅ **RBAC**: Admin-only access for POST/PUT/DELETE, public GET  
✅ **Security**: Protected routes, token validation, role checking  
✅ **Error Handling**: Middleware for logging and error responses  

## Notes

- This project was built for Assignment 4 requirements
- All security best practices are implemented
- The architecture is scalable and maintainable
- Ready for production deployment with proper environment variables

## Need Help?

Check the browser console (F12) for frontend errors  
Check the server terminal for backend errors  
Verify your `.env` file configuration  
Ensure MongoDB connection is working  

Enjoy managing your tasks! 🎉
