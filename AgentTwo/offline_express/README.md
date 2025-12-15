# Offline Express

A simple backend service built with Express.js that provides a JSON hello world API and Windows authentication.

## Setup

### Prerequisites
- Node.js (v14 or higher recommended)
- npm (comes with Node.js)
- Windows operating system with PowerShell enabled
- PowerShell execution policy that allows running commands (required for Windows authentication)

### Installation

1. Clone this repository
   ```
   git clone https://github.com/yourusername/offline_express.git
   cd offline_express
   ```

2. Install dependencies
   ```
   npm install
   ```

## Usage

### Start the server

```
npm start
```

For development with automatic restart on file changes:
```
npm run dev
```

The server will start on http://localhost:9090

### Build for production

```
npm run build
```

This creates a `dist` folder with the necessary files for deployment, including:
- server.js
- package.json
- controllers/
- routes/

## API Endpoints

### Basic Endpoints

1. **Home**
   - URL: `/`
   - Method: GET
   - Response: `{ "message": "Welcome to the offline_express API" }`

2. **Hello World**
   - URL: `/api/hello`
   - Method: GET
   - Response: `{ "hello": "world" }`

### Windows Authentication

3. **Windows Login**
   - URL: `/api/login/window-login`
   - Method: POST
   - Request Body:
     ```json
     {
       "username": "windowsUsername",
       "password": "windowsPassword"
     }
     ```
   - Success Response:
     ```json
     {
       "success": true,
       "message": "Login success"
     }
     ```
   - Error Response:
     ```json
     {
       "success": false,
       "message": "Login Failed: Invalid User Credential."
     }
     ```

   - Notes:
     - The username must match the current Windows user (case-insensitive)
     - Authentication uses the Windows LogonUser API via PowerShell, providing proper credentials validation
     - The domain is currently set to "hafizi" in the code (can be changed to match your environment)
     - Requires application to run on a Windows machine with PowerShell enabled
     - PowerShell execution policy must allow running commands
     - The application must have sufficient permissions to execute PowerShell commands
     - This implementation matches the Java Spring Boot backend (offline_springboot) authentication logic

## SQLite Database

This application uses SQLite as its database engine, which is a lightweight, disk-based database that doesn't require a separate server process.

### Database Structure

The database consists of two main tables:

1. **BIYPA_OFFLINE_FORM** - Stores form data
   - Primary key: `uuid`
   - Contains form metadata and payload JSON
   - Status tracking for synchronization

2. **HISTORY** - Tracks form operations history
   - Primary key: `uuid`
   - Foreign key: `uuidOffline` referencing `BIYPA_OFFLINE_FORM(uuid)`
   - Records events like creation, updates, and deletions

### Database Configuration

The SQLite database is automatically initialized when the application starts. The database file is stored in the `data` directory as `offline_express.db`.

Configuration can be found in `config/database.js`.

### Data Models

- **BiypaOfflineForm** (`models/BiypaOfflineForm.js`): Handles CRUD operations for forms
- **History** (`models/History.js`): Handles CRUD operations for history records

### Service Layer

The `services/formService.js` file implements business logic similar to the Java Spring Boot implementation, including:
- Form creation with history tracking
- Form updates with history tracking
- Soft deletion with history tracking
- Transaction support

### API Endpoints for Forms

The following endpoints are available for managing forms:

1. **List Forms**
   - URL: `/api/forms`
   - Method: GET
   - Query Parameters:
     - `page`: Page number (default: 1)
     - `limit`: Items per page (default: 10)
   - Response: List of forms with pagination info

2. **Get Form by UUID**
   - URL: `/api/forms/:uuid`
   - Method: GET
   - Response: Form details and related history records

3. **Create Form**
   - URL: `/api/forms`
   - Method: POST
   - Request Body: Form data
   - Response: Created form

4. **Update Form**
   - URL: `/api/forms/:uuid`
   - Method: PUT
   - Request Body: Updated form data
   - Response: Updated form

5. **Soft Delete Form**
   - URL: `/api/forms/:uuid/soft-delete`
   - Method: PATCH
   - Request Body: `{ "deletedBy": "username" }`
   - Response: Result of soft delete operation

6. **Hard Delete Form**
   - URL: `/api/forms/:uuid`
   - Method: DELETE
   - Response: Result of delete operation

7. **Search Forms**
   - URL: `/api/forms/search`
   - Method: GET
   - Query Parameters:
     - `customerName`: Filter by customer name
     - `formType`: Filter by form type
     - `status`: Filter by status
     - `formCategory`: Filter by form category
     - `page`: Page number (default: 1)
     - `limit`: Items per page (default: 10)
   - Response: Matching forms with pagination info

### Data Migration

A data migration utility is provided in `utils/dataMigration.js` to help migrate data from H2DB (Java) to SQLite (Node.js):

1. **Export Data from H2DB**
   
   Execute the following SQL in your H2 console:
   
   ```sql
   -- Export BIYPA_OFFLINE_FORM table
   CALL CSVWRITE('export_forms.csv', 'SELECT * FROM BIYPA_OFFLINE_FORM');
   
   -- Export HISTORY table
   CALL CSVWRITE('export_history.csv', 'SELECT * FROM HISTORY');
   ```

2. **Import Data into SQLite**
   
   Place the exported CSV files in your project directory, then use the migration utility:
   
   ```javascript
   const { runMigration } = require('./utils/dataMigration');
   
   // Run migration
   runMigration('path/to/export_forms.csv', 'path/to/export_history.csv')
     .then(result => {
       console.log('Migration completed:', result);
     })
     .catch(error => {
       console.error('Migration failed:', error);
     });
   ```

### Important Notes

- The database file is created automatically if it doesn't exist
- SQLite supports concurrent reads but only one write at a time
- For production use, ensure your application has appropriate file permissions to read/write the database file
- Regular backups of the database file are recommended

## Security Considerations

1. **PowerShell Execution**
   - The Windows authentication endpoint uses PowerShell to verify credentials via the Windows LogonUser API
   - Make sure the application runs with appropriate permissions
   - Consider using HTTPS in production to encrypt credentials in transit

2. **Password Handling**
   - Passwords are properly validated against Windows credentials
   - Special characters in passwords are properly escaped
   - Credentials are only held in memory during the authentication process
   - Temporary authentication scripts are automatically deleted after use

3. **Domain Authentication**
   - The authentication uses a domain specified in the code (currently "hafizi")
   - To change the domain to match your environment, modify the `$domain` variable in `loginController.js`

## Troubleshooting

### Windows Authentication Issues

1. **PowerShell Execution Policy**
   - If authentication fails with PowerShell execution errors, check your execution policy:
     ```
     Get-ExecutionPolicy
     ```
   - You may need to adjust it for the application to work:
     ```
     Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
     ```

2. **Permission Issues**
   - The application needs sufficient permissions to run PowerShell commands
   - Try running the application as an administrator if authentication fails

3. **Username Mismatch**
   - The API will only authenticate the current Windows user
   - Verify that the username in the request matches your Windows login name (case-insensitive)
   - To check your Windows username: `echo %USERNAME%` in cmd or `$env:USERNAME` in PowerShell

4. **Domain Issues**
   - If authentication fails, ensure the domain in the code matches your Windows domain
   - To check your domain: `whoami` in cmd or PowerShell (format is DOMAIN\username)
   - Update the `$domain` variable in `loginController.js` if needed

## Testing the API

You can test the API using curl, Postman, or any web browser.

### Using curl

```bash
# Test home endpoint
curl http://localhost:9090/

# Test hello world endpoint
curl http://localhost:9090/api/hello

# Test Windows login authentication
curl -X POST http://localhost:9090/api/login/window-login \
  -H "Content-Type: application/json" \
  -d '{"username":"yourWindowsUsername","password":"yourWindowsPassword"}'
```

### Using Postman

For testing Windows authentication:
1. Create a POST request to http://localhost:9090/api/login/window-login
2. Set Content-Type header to application/json
3. In the request body, provide JSON with username and password
