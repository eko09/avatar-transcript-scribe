
# HeyGen Loading Issue Troubleshooting

If you're still seeing the loading message after 5+ minutes, follow these steps:

## Step 1: Check HeyGen URL
1. Copy this URL and test it directly in your browser:
   `https://labs.heygen.com/guest/streaming-embed?share=eyJxdWFsaXR5IjoiaGlnaCIsImF2YXRhck5hbWUiOiJKdW5lX0hSX3B1YmxpYyIsInByZXZpZXdJbWciOiJodHRwczovL2ZpbGVzMi5oZXlnZW4uYWkvYXZhdGFyL3YzLzc0NDQ3YTI3ODU5YTQ1NmM5NTVlMDFmMjFlZjE4MjE2XzQ1NjIwL3ByZXZpZXdfdGFsa18xLndlYnAiLCJuZWVkUmVtb3ZlQmFja2dyb3VuZCI6ZmFsc2UsImtub3dsZWRnZUJhc2VJZCI6ImFjODY1MWMzOWNlNTRiNTQ4NTkzOWRhZWM4YjdiZjRlIiwidXNlcm5hbWUiOiJhODQ1OTg5ZWY3NTY0NmY5OWZmY2RhOWNmMDMwMjVlNSJ9&inIFrame=1`

2. If it doesn't work, you need to get a valid HeyGen embed URL from your HeyGen account

## Step 2: Check Browser Console
1. In Qualtrics preview, press F12 to open Developer Tools
2. Go to Console tab
3. Look for error messages starting with ❌
4. Check if you see messages starting with 🚀, ✅, 📝

## Step 3: Test Container Detection
1. In the console, type: `document.getElementById('heygen-streaming-embed')`
2. It should return an HTML element, not null
3. If null, the container wasn't added correctly to your question

## Step 4: Check Network Issues
1. In Developer Tools, go to Network tab
2. Reload the page
3. Look for failed requests to heygen.com domains
4. Check if iframe is being blocked

## Step 5: Alternative Embed Method
If the above doesn't work, try this simpler approach:

1. Replace the JavaScript with just:
```javascript
Qualtrics.SurveyEngine.addOnload(function() {
    var container = document.getElementById('heygen-streaming-embed');
    if (container) {
        container.innerHTML = '<iframe src="YOUR_HEYGEN_URL" width="100%" height="500" frameborder="0" allow="microphone"></iframe>';
    }
});
```

## Step 6: Check Qualtrics Settings
1. Make sure Rich Content Editor is enabled
2. Check if JavaScript is allowed in your Qualtrics account
3. Verify iframe embedding is not restricted

## Step 7: Contact Support
If none of the above works:
1. Share your browser console logs
2. Confirm your HeyGen URL works outside of Qualtrics
3. Check with your Qualtrics administrator about iframe restrictions
