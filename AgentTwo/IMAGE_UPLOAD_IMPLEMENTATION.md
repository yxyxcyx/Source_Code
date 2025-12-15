# Image Upload Feature Implementation

## Overview
Successfully implemented image upload functionality for the Alliance Bank chatbot, allowing users to upload images that will be processed by Azure OpenAI's Vision API.

## Changes Made

### 1. Frontend Components

#### ChatInput Component (`src/components/Chat/ChatInput.tsx`)
- Added file input with image preview functionality
- Added image upload button (📎 icon) to trigger file selection
- Implemented image preview with remove button
- Converts uploaded images to base64 data URLs
- Updated send button to be enabled when either text or image is present
- Added styled components for image preview and upload button

**Key Features:**
- File type validation (only accepts images)
- Image preview before sending
- Remove image functionality
- Base64 encoding for transmission

#### ChatMessage Component (`src/components/Chat/ChatMessage.tsx`)
- Added `imageUrl` prop to display uploaded images
- Renders images in message bubbles with proper styling
- Images are displayed above text content
- Maximum dimensions: 400x400px with responsive scaling

#### ChatContainer Component (`src/components/Chat/ChatContainer.tsx`)
- Updated `Message` interface to include `imageUrl` property
- Modified `handleSendMessage` to accept and pass `imageUrl` parameter
- Updated message rendering to pass `imageUrl` to ChatMessage component
- Integrated image data with Azure AI service calls

### 2. Backend Service

#### Azure AI Service (`src/services/azure-ai-service.ts`)
- Updated `getChatCompletion` method signature to accept optional `imageUrl` parameter
- Implemented Azure OpenAI Vision API format for image messages
- Messages with images use the multimodal content format:
  ```javascript
  {
    role: 'user',
    content: [
      { type: 'text', text: userMessage },
      { type: 'image_url', image_url: { url: imageUrl } }
    ]
  }
  ```
- Maintains backward compatibility for text-only messages

#### Express Server (`offline_express/server.js`)
- Increased JSON payload limit to 50MB to support base64 encoded images
- Updated both `express.json()` and `express.urlencoded()` middleware

## How It Works

1. **User uploads image:**
   - User clicks the 📎 button in the chat input
   - Selects an image file from their device
   - Image is converted to base64 data URL and displayed as preview

2. **Sending message with image:**
   - User can add optional text description
   - Clicks send button (enabled when image or text is present)
   - Image data URL is passed along with text to the backend

3. **Backend processing:**
   - Express server receives the request with base64 image data
   - Azure OpenAI proxy forwards the request to Azure OpenAI Vision API
   - API processes both text and image content together

4. **Display in chat:**
   - User message shows the uploaded image and text
   - Bot response appears below with analysis/response
   - Images are displayed with proper styling and dimensions

## Technical Details

### Image Format
- Images are converted to base64 data URLs
- Format: `data:image/[type];base64,[encoded-data]`
- Supported by Azure OpenAI Vision API

### Size Limits
- Frontend: No explicit limit (browser memory dependent)
- Backend: 50MB payload limit
- Recommended: Keep images under 5MB for optimal performance

### Compatibility
- Works with Azure OpenAI GPT-4 Vision models
- Requires deployment with vision capabilities enabled
- Falls back gracefully for text-only models

## Testing Recommendations

1. **Test image upload:**
   - Upload various image formats (PNG, JPG, GIF)
   - Verify preview displays correctly
   - Test remove image functionality

2. **Test sending:**
   - Send image only (no text)
   - Send image with text
   - Send text only (existing functionality)

3. **Test display:**
   - Verify images appear in chat history
   - Check responsive sizing
   - Test with large images

4. **Test backend:**
   - Verify Azure OpenAI receives image data
   - Check response includes image analysis
   - Monitor payload sizes and performance

## Important Notes

1. **Azure OpenAI Configuration:**
   - Ensure your Azure OpenAI deployment supports vision capabilities
   - Use GPT-4 Vision or compatible model
   - Update deployment name in environment variables if needed

2. **Performance Considerations:**
   - Large images increase payload size and processing time
   - Consider adding client-side image compression for production
   - Monitor API costs as vision requests may be more expensive

3. **Security:**
   - Images are transmitted as base64 in request body
   - No server-side storage implemented
   - Consider adding image validation/sanitization for production

## Future Enhancements

1. **Image Compression:**
   - Add client-side image compression before upload
   - Reduce payload size for better performance

2. **Multiple Images:**
   - Support uploading multiple images per message
   - Add image carousel for display

3. **Image Storage:**
   - Implement server-side image storage
   - Use Azure Blob Storage for persistence
   - Reference images by URL instead of base64

4. **File Type Expansion:**
   - Support PDF documents
   - Support other file types for analysis

5. **Progress Indicators:**
   - Add upload progress bar
   - Show processing status for large images
