
# HeyGen AI Avatar Integration for Qualtrics

## Overview
This integration captures HeyGen AI avatar interactions within Qualtrics surveys and saves transcript data to your Supabase database. It now includes proper event listeners for `AVATAR_TALKING_MESSAGE` and `USER_TALKING_MESSAGE` events.

## Setup Instructions

### 1. Prepare Your Qualtrics Survey

1. **Create Embedded Data Fields**:
   - Go to Survey Flow in your Qualtrics survey
   - Add an "Embedded Data" element at the beginning
   - Create these fields:
     - `transcript_data` (stores real-time transcript summary)
     - `transcript_session_summary` (stores final session summary)

2. **Add a Text/Graphic Question**:
   - Create a new question where you want the HeyGen avatar to appear
   - Choose "Text/Graphic" question type
   - You can leave the question text empty or add instructions

### 2. Add the JavaScript Code

1. **Access Question JavaScript**:
   - Click on the question where you want the avatar
   - Click the gear icon ⚙️ and select "Add JavaScript"

2. **Copy and Paste the Script**:
   - Copy the entire content from `qualtrics-heygen-embed.js`
   - Paste it into the JavaScript editor
   - Click "Save"

### 3. Configuration Variables

The script includes these pre-configured settings:

```javascript
// HeyGen Configuration
const HEYGEN_TOKEN = 'NDA4NTU0MThhNmRlNGE4ZWEzNzMwMzBjZTAwZTAzNDUtMTc1MDA4NDUyMA==';
const HEYGEN_AVATAR_ID = 'Judy_Teacher_Sitting2_public';
const HEYGEN_KNOWLEDGE_BASE_ID = 'f4438415581ee42f090a5f2f35f0309be';

// Supabase credentials (already configured for your project)
const SUPABASE_URL = "https://xcznuookkehqcfcrhevq.supabase.co";
const SUPABASE_ANON_KEY = "your_anon_key_here";
```

### 4. Event Capture Features

The integration now properly captures these HeyGen SDK events:

#### Avatar Talking Messages
```javascript
avatar.on('AVATAR_TALKING_MESSAGE', (message) => {
    console.log('🤖 Avatar talking message:', message);
    // Automatically saves to database with speaker: 'AI Avatar'
});
```

#### User Talking Messages  
```javascript
avatar.on('USER_TALKING_MESSAGE', (message) => {
    console.log('👤 User talking message:', message);
    // Automatically saves to database with speaker: 'User'
});
```

#### Additional System Events
- `AVATAR_READY`: When avatar is ready to interact
- `STREAM_READY`: When streaming starts
- `STREAM_DISCONNECTED`: When streaming ends
- `CONNECTION_ERROR`: When connection issues occur

### 5. Data Structure

**In Supabase `transcripts` table**:
- `session_id`: Unique identifier for each survey response
- `speaker`: "User", "AI Avatar", or "System"
- `content`: The actual message/transcript content
- `timestamp`: When the message occurred
- `metadata`: Includes event type, Qualtrics response ID, and original event data

**In Qualtrics Embedded Data**:
- `transcript_data`: Real-time summary with last 10 messages
- `transcript_session_summary`: Session statistics including message counts

### 6. Testing the Integration

1. **Use the Test Page**:
   - Open `qualtrics-test-page.html` in a browser
   - Interact with the avatar to test transcript capture
   - Check browser console for event logging

2. **Preview Your Survey**:
   - Use Qualtrics' preview feature
   - Speak to the avatar and verify messages are captured
   - Check your Supabase dashboard for saved transcripts

### 7. Message Processing Flow

1. **Event Triggered**: HeyGen SDK fires `AVATAR_TALKING_MESSAGE` or `USER_TALKING_MESSAGE`
2. **Content Extraction**: Script extracts message content from event data
3. **Database Save**: Transcript saved to Supabase with metadata
4. **Qualtrics Update**: Embedded data fields updated with conversation summary
5. **Console Logging**: Events logged for debugging

### 8. Troubleshooting

**Avatar doesn't load**:
- Check browser console for HeyGen SDK loading errors
- Verify your HeyGen token is valid
- Ensure iframe permissions allow SDK loading

**Events not capturing**:
- Check console for event listener registration
- Verify HeyGen SDK version compatibility
- Test with browser developer tools network tab

**Database not saving**:
- Verify Supabase credentials are correct
- Check RLS policies allow public access
- Monitor Supabase logs for insert errors

**Embedded Data not updating**:
- Verify field names match exactly in Survey Flow
- Check Qualtrics JavaScript console for errors
- Ensure embedded data fields are created before the question

### 9. Console Output Examples

When working correctly, you should see:
```
🚀 Initializing HeyGen SDK...
✅ HeyGen SDK loaded
✅ Avatar ready
🤖 Avatar talking message: {message: "Hello! How can I help you today?"}
📝 AI Avatar: Hello! How can I help you today?
✅ Transcript saved successfully
👤 User talking message: {message: "I need help with my homework"}
📝 User: I need help with my homework
✅ Transcript saved successfully
✅ Qualtrics embedded data updated
```

### 10. Advanced Features

**Custom Event Handling**: The script processes various message formats and extracts content from different event structures.

**Session Tracking**: Each survey response gets a unique session ID for transcript organization.

**Real-time Updates**: Qualtrics embedded data updates in real-time as conversations progress.

**Error Handling**: Comprehensive error handling for connection issues and API failures.

## Support

If you encounter issues:
1. Check browser console for detailed error messages
2. Verify all configuration parameters are correct
3. Test HeyGen SDK events in isolation
4. Monitor Supabase dashboard for data flow
5. Check Qualtrics embedded data in Survey Flow

The integration now properly captures both avatar and user messages using the official HeyGen SDK event listeners as documented in the HeyGen SDK reference.
