
# HeyGen AI Avatar Integration for Qualtrics

## Overview
This integration captures HeyGen AI avatar interactions within Qualtrics surveys and saves transcript data to your Supabase database.

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

### 3. Customize Configuration

Before using, update these variables in the script:

```javascript
// Replace with your specific HeyGen avatar URL
const HEYGEN_EMBED_URL = "YOUR_HEYGEN_EMBED_URL_HERE";

// Supabase credentials are already configured for your project
const SUPABASE_URL = "https://xcznuookkehqcfcrhevq.supabase.co";
const SUPABASE_ANON_KEY = "your_anon_key_here";
```

### 4. Test the Integration

1. **Use the Test Page**:
   - Open `qualtrics-test-page.html` in a browser
   - Interact with the avatar to test transcript capture
   - Check your Supabase dashboard to verify data is being saved

2. **Preview Your Survey**:
   - Use Qualtrics' preview feature to test the integration
   - Verify the avatar loads and interactions are captured

### 5. Data Structure

The script captures and stores:

**In Supabase `transcripts` table**:
- `session_id`: Unique identifier for each survey response
- `speaker`: "User", "AI Avatar", or "System"
- `content`: The actual message/transcript content
- `timestamp`: When the message occurred
- `metadata`: Additional data including Qualtrics response ID

**In Qualtrics Embedded Data**:
- `transcript_data`: Real-time summary with last 10 messages
- `transcript_session_summary`: Final session statistics

### 6. Message Types Captured

The integration captures these interaction types:
- **User messages**: Speech input, text input
- **Avatar responses**: AI-generated responses
- **System events**: Session start/end, avatar ready status
- **Conversation flow**: Start and end of conversations

### 7. Troubleshooting

**Avatar doesn't load**:
- Check that your HeyGen embed URL is correct
- Verify iframe permissions in Qualtrics
- Check browser console for errors

**Transcript not saving**:
- Verify Supabase credentials are correct
- Check network tab for API call errors
- Ensure RLS policies allow public access

**Embedded Data not updating**:
- Verify field names match exactly: `transcript_data`
- Check that Embedded Data is set up in Survey Flow

### 8. Privacy and Compliance

- The script captures all audio interactions as text
- Data is stored in your Supabase database
- Consider adding privacy notices to your survey
- Comply with relevant data protection regulations

### 9. Advanced Customization

You can modify the script to:
- Filter specific message types
- Add custom metadata fields
- Implement additional data validation
- Customize the avatar container styling

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify all configuration parameters
3. Test with the provided HTML test page first
4. Check Supabase dashboard for data flow
