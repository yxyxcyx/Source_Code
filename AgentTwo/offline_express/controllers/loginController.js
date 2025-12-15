const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const https = require('https');
const tls = require('tls');

/**
 * Windows login authentication controller that matches the Java implementation
 * @param {Object} req - Express request object with username and password
 * @param {Object} res - Express response object
 */
const windowsLogin = async (req, res) => {
  const { username, password } = req.body;
  
  // Temporary admin bypass
  if (username === 'admin' && password === 'admin') {
    console.log("Admin login bypass used");
    return res.json({
      success: true,
      message: "Admin login successful"
    });
  }
  
  if (!username || !password) {
    return res.status(200).json({ 
      success: false, 
      message: 'Username and password are required' 
    });
  }

  try {
    // Get current Windows username (equivalent to System.getProperty("user.name") in Java)
    const currentWindowsUsername = os.userInfo().username;
    
    console.log(`Current Windows username: ${currentWindowsUsername}`);
    console.log(`Provided username: ${username}`);

    // Check if the provided username matches the current Windows username
    if (currentWindowsUsername.toLowerCase() === username.toLowerCase()) {
      try {
        // Create a temporary PowerShell script with a simpler authentication approach
        const tempScriptPath = path.join(os.tmpdir(), `auth_${Date.now()}.ps1`);
        
        const scriptContent = `
# Simpler authentication approach using net use
try {
    $securePass = ConvertTo-SecureString -String "${password.replace(/"/g, '``"')}" -AsPlainText -Force
    $cred = New-Object System.Management.Automation.PSCredential("hafizi\\${username.replace(/"/g, '``"')}", $securePass)
    
    # Test credentials with a simple command
    $result = Start-Process powershell -Credential $cred -ArgumentList "-Command Write-Host 'Authentication test'" -WindowStyle Hidden -Wait -PassThru
    
    if ($result.ExitCode -eq 0) {
        Write-Output "Authentication successful"
        exit 0
    } else {
        Write-Error "Authentication failed with exit code: $($result.ExitCode)"
        exit 1
    }
} catch {
    Write-Error "Authentication error: $_"
    exit 1
}`;

        // Write the script to a temporary file
        await fs.writeFile(tempScriptPath, scriptContent);

        try {
          // Execute the PowerShell script with window hidden
          console.log(`Attempting authentication for hafizi\\${username}`);
          await execPromise(`powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File "${tempScriptPath}"`);
          
          // If we got here, authentication was successful
          console.log("Login Success");
          return res.json({
            success: true,
            message: "Login success"
          });
        } catch (execError) {
          // Command execution failed due to invalid credentials
          const errorCode = execError.code || 0;
          console.error(`Login failed. Error code: ${errorCode}`);
          return res.status(200).json({
            success: false,
            message: "Login Failed: Invalid User Credential."
          });
        } finally {
          // Clean up - delete the temporary script file
          try {
            await fs.unlink(tempScriptPath);
          } catch (unlinkError) {
            console.error('Error deleting temp script file:', unlinkError);
          }
        }
      } catch (error) {
        console.error('Authentication process error:', error);
        return res.status(200).json({
          success: false,
          message: "Login Failed: Authentication process error",
          error: error.message
        });
      }
    } else {
      // Username doesn't match current Windows user
      console.info("Login Failed");
      return res.status(200).json({
        success: false,
        message: "Login Failed: Invalid User Credentials"
      });
    }
  } catch (error) {
    console.error('Windows authentication error:', error);
    return res.status(200).json({
      success: false,
      message: 'Authentication error',
      error: error.message
    });
  }
};

// Define API endpoints matching Java implementation
const API_ENDPOINTS = {
  authUrl: 'https://services-uat.dbosuat.corp.alliancebg.com.my/dbob/auth/public/v1/auth/e2ee',
  cifListing: 'https://services-uat.dbosuat.corp.alliancebg.com.my/dbob/soap/protected/v1/cif/listing',
  cusCifNo: 'https://services-uat.dbosuat.corp.alliancebg.com.my/wealth/eform/protected/v1/getCustomerInfoByCifNo'
};

/**
 * Online authentication controller that matches the Java Spring Boot implementation
 * @param {Object} req - Express request object with username, password, and clientSecret
 * @param {Object} res - Express response object
 */
const authLogin = async (req, res) => {
  try {
    const { username, password, clientSecret } = req.body;
    
    // Return null accessToken if credentials are missing or empty
    if (!username || !password || !clientSecret || 
        username.trim() === '' || password.trim() === '') {
      console.log('Login failed: Missing or empty credentials');
      return res.status(200).json({
        accessToken: null
      });
    }

    // Make a POST request to the external auth service exactly like Spring Boot
    try {
      // Headers
      const headers = {
        'Accept': 'application/json',
        'Authorization': `Basic ${clientSecret}`
      };

      // Form data
      const formData = new URLSearchParams();
      formData.append('grant_type', 'password');
      formData.append('username', username);
      formData.append('password', password);

      console.log(`Attempting authentication for user: ${username} to ${API_ENDPOINTS.authUrl}`);
      
      // Create a custom https agent that enforces TLS 1.2 (required for PTVA)
      // and matches Spring Boot's HttpClientUtil implementation
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false, // Trust self-signed certificates (same as Java's TrustManager)
        // Use Node.js 10+ style TLS configuration
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.2'
      });
      
      // Make the HTTP request with TLS 1.2
      const response = await axios.post(
        API_ENDPOINTS.authUrl, 
        formData, 
        { 
          headers,
          httpsAgent, // Use the TLS 1.2 agent
          timeout: 10000 // 10 second timeout
        }
      );
      
      console.log('Auth service response:', response.data);
      
      // Parse the response to extract the access token
      const accessToken = response.data.access_token;
      
      // Return response in the exact format of Java's ResponseAuthVo
      return res.status(200).json({
        accessToken: accessToken || null
      });
    } catch (apiError) {
      console.error('API call failed:', apiError.message);
      // Authentication failed or API error
      return res.status(200).json({
        accessToken: null
      });
    }
  } catch (error) {
    console.error('Auth login error:', error);
    // Return null accessToken on error, matching Java behavior
    return res.status(200).json({
      accessToken: null
    });
  }
};

/**
 * Get CIF information - matches Spring Boot implementation
 * @param {Object} req - Express request object with idNo, dob, and authorizationCode
 * @param {Object} res - Express response object
 */
const getCif = async (req, res) => {
  try {
    const { idNo, dob, authorizationCode } = req.body;
    
    // Return empty response if required fields are missing
    if (!idNo || !dob || !authorizationCode) {
      console.log('CIF request failed: Missing required fields');
      return res.status(200).json({});
    }

    // Create a custom https agent for TLS 1.2
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false, // Trust self-signed certificates
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.2'
    });

    // First API call to get CIF listing
    const url = `${API_ENDPOINTS.cifListing}?idNo=${idNo}&idType=IN&country=MY&dob=${dob}`;
    
    try {
      console.log(`Calling CIF listing API: ${url}`);
      
      // Headers for the request
      const headers = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${authorizationCode}`
      };
      
      // Make the HTTP request to the CIF listing API
      const response = await axios.get(
        url,
        { 
          headers,
          httpsAgent,
          timeout: 10000
        }
      );
      
      console.log('CIF listing API response:', response.data);
      
      // Initialize response object (exact format as Spring Boot)
      const cifResponse = {
        listing: "",
        email: "",
        mobileNo: "",
        fullName: "",
        responseData: ""
      };
      
      // Parse the response
      const responseData = response.data;
      
      // Check for error in response
      if (responseData.error) {
        cifResponse.responseData = JSON.stringify(responseData);
        return res.status(200).json(cifResponse);
      }
      
      // Extract the listing array and get the first element
      if (responseData.listing && responseData.listing.length > 0) {
        // Store the first CIF number
        const cifNo = responseData.listing[0];
        cifResponse.listing = cifNo;
        
        // Make second API call to get customer info using the cifNo
        try {
          await getCustomerInfoByCifNo(cifNo, authorizationCode, cifResponse, httpsAgent);
        } catch (customerInfoError) {
          console.error('Failed to get customer info:', customerInfoError.message);
          // Keep the listing but return what we have so far
          cifResponse.responseData = JSON.stringify(responseData);
        }
      } else {
        // No listing found, just return the response data
        cifResponse.responseData = JSON.stringify(responseData);
      }
      
      return res.status(200).json(cifResponse);
      
    } catch (apiError) {
      console.error('CIF API call failed:', apiError.message);
      // Return empty response on error, matching Spring Boot behavior
      return res.status(200).json({
        listing: "",
        email: "",
        mobileNo: "",
        fullName: "",
        responseData: ""
      });
    }
  } catch (error) {
    console.error('getCif error:', error);
    // Return empty response on error
    return res.status(200).json({
      listing: "",
      email: "",
      mobileNo: "",
      fullName: "",
      responseData: ""
    });
  }
};

/**
 * Helper function to get customer info by CIF number
 * @param {String} cifNo - CIF number
 * @param {String} authorizationCode - Authorization token
 * @param {Object} cifResponse - Response object to update
 * @param {https.Agent} httpsAgent - HTTPS agent for TLS 1.2
 */
const getCustomerInfoByCifNo = async (cifNo, authorizationCode, cifResponse, httpsAgent) => {
  try {
    const customerInfoUrl = `${API_ENDPOINTS.cusCifNo}?cifNo=${cifNo}`;
    
    console.log(`Calling customer info API: ${customerInfoUrl}`);
    
    // Headers for the request
    const headers = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${authorizationCode}`
    };
    
    // Make the HTTP request to the customer info API
    const response = await axios.get(
      customerInfoUrl,
      { 
        headers,
        httpsAgent,
        timeout: 10000
      }
    );
    
    console.log('Customer info API response:', response.data);
    
    // Extract customer information - exact match to Spring Boot
    const customerData = response.data;
    
    // Set the values in the cifResponse object exactly as Spring Boot does
    cifResponse.email = customerData.email || '';
    cifResponse.mobileNo = customerData.mobileNo || '';
    cifResponse.fullName = customerData.fullName || '';
    
    // Set the full customer data response as responseData
    // This is the key difference - Spring Boot uses the second API response as responseData
    cifResponse.responseData = JSON.stringify(customerData);
    
  } catch (error) {
    console.error('Customer info API call failed:', error.message);
    // Don't throw the error, we'll handle partial responses in the main function
  }
};

module.exports = {
  windowsLogin,
  authLogin,
  getCif
};
