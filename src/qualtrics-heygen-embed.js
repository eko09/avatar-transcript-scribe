
Qualtrics.SurveyEngine.addOnload(function() {
    console.log('🚀 HeyGen Qualtrics Integration - Starting...');
    
    // Configuration - REPLACE WITH YOUR ACTUAL HEYGEN URL
    var HEYGEN_EMBED_URL = "https://labs.heygen.com/guest/streaming-embed?share=eyJxdWFsaXR5IjoiaGlnaCIsImF2YXRhck5hbWUiOiJKdW5lX0hSX3B1YmxpYyIsInByZXZpZXdJbWciOiJodHRwczovL2ZpbGVzMi5oZXlnZW4uYWkvYXZhdGFyL3YzLzc0NDQ3YTI3ODU5YTQ1NmM5NTVlMDFmMjFlZjE4MjE2XzQ1NjIwL3ByZXZpZXdfdGFsa18xLndlYnAiLCJuZWVkUmVtb3ZlQmFja2dyb3VuZCI6ZmFsc2UsImtub3dsZWRnZUJhc2VJZCI6ImFjODY1MWMzOWNlNTRiNTQ4NTkzOWRhZWM4YjdiZjRlIiwidXNlcm5hbWUiOiJhODQ1OTg5ZWY3NTY0NmY5OWZmY2RhOWNmMDMwMjVlNSJ9&inIFrame=1";
    
    // Supabase configuration
    var SUPABASE_URL = "https://xcznuookkehqcfcrhevq.supabase.co";
    var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhjem51b29ra2VocWNmY3JoZXZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4OTk4NzUsImV4cCI6MjA2NjQ3NTg3NX0.t9rsVefD7nElpgNiH9WGN5CymJrNL_KF_xNJFgNAeCg";
    
    // Generate unique session ID
    var sessionId = 'qualtrics_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    var responseId = "${e://Field/ResponseID}";
    
    console.log('📋 Session ID:', sessionId);
    console.log('📋 Response ID:', responseId);
    
    // Initialize transcript data storage
    var transcriptData = [];
    
    // Function to save transcript to Supabase
    function saveToSupabase(transcriptEntry) {
        var data = {
            session_id: sessionId,
            speaker: transcriptEntry.speaker,
            content: transcriptEntry.content,
            timestamp: transcriptEntry.timestamp,
            metadata: {
                qualtrics_response_id: responseId,
                source: 'qualtrics_survey'
            }
        };
        
        // Add any additional metadata
        if (transcriptEntry.metadata) {
            for (var key in transcriptEntry.metadata) {
                if (transcriptEntry.metadata.hasOwnProperty(key)) {
                    data.metadata[key] = transcriptEntry.metadata[key];
                }
            }
        }
        
        fetch(SUPABASE_URL + '/rest/v1/transcripts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(data)
        }).then(function(response) {
            if (response.ok) {
                console.log('✅ Saved to Supabase:', transcriptEntry.speaker, transcriptEntry.content.substring(0, 50));
            } else {
                console.error('❌ Supabase save failed:', response.status, response.statusText);
            }
        }).catch(function(error) {
            console.error('❌ Supabase error:', error);
        });
    }
    
    // Function to handle and process transcript entries
    function handleTranscript(transcriptEntry) {
        console.log('📝 Processing transcript:', transcriptEntry.speaker, '-', transcriptEntry.content.substring(0, 100));
        
        // Add to local storage
        transcriptData.push(transcriptEntry);
        
        // Save to Supabase
        saveToSupabase(transcriptEntry);
        
        // Update Qualtrics embedded data with recent messages
        var recentMessages = transcriptData.slice(-10).map(function(entry) {
            return {
                speaker: entry.speaker,
                content: entry.content.substring(0, 200),
                timestamp: entry.timestamp
            };
        });
        
        try {
            Qualtrics.SurveyEngine.setEmbeddedData('transcript_data', JSON.stringify(recentMessages));
            console.log('📊 Updated Qualtrics embedded data');
        } catch (error) {
            console.error('❌ Failed to update embedded data:', error);
        }
    }
    
    // Message handler for iframe communication
    function handleMessage(event) {
        console.log('📨 Received message:', event.data, 'from:', event.origin);
        
        // Security check - only accept messages from HeyGen domains
        if (!event.origin.includes('heygen.com') && !event.origin.includes('labs.heygen.com')) {
            console.log('⚠️ Ignoring message from untrusted origin:', event.origin);
            return;
        }
        
        if (!event.data || typeof event.data !== 'object') {
            return;
        }
        
        var messageData = event.data;
        var timestamp = new Date().toISOString();
        
        // Handle different types of HeyGen messages
        if (messageData.type === 'transcript' || messageData.type === 'ai_response') {
            handleTranscript({
                speaker: 'AI Avatar',
                content: messageData.data.content || messageData.content || '',
                timestamp: messageData.data.timestamp || timestamp,
                metadata: {
                    type: messageData.type,
                    source: 'heygen_avatar'
                }
            });
        } else if (messageData.type === 'user_message' || messageData.type === 'user_input') {
            handleTranscript({
                speaker: 'User',
                content: messageData.data.message || messageData.data.content || messageData.message || '',
                timestamp: messageData.data.timestamp || timestamp,
                metadata: {
                    type: messageData.type,
                    source: 'user_input'
                }
            });
        } else if (messageData.type === 'avatar_ready' || messageData.action === 'ready') {
            console.log('🤖 HeyGen avatar is ready');
            handleTranscript({
                speaker: 'System',
                content: 'HeyGen avatar ready for interaction',
                timestamp: timestamp,
                metadata: {
                    type: 'system_event',
                    event: 'avatar_ready'
                }
            });
        } else if (messageData.type === 'conversation_start') {
            handleTranscript({
                speaker: 'System',
                content: 'Conversation started with AI avatar',
                timestamp: timestamp,
                metadata: {
                    type: 'system_event',
                    event: 'conversation_start'
                }
            });
        }
    }
    
    // Add global message listener
    if (window.addEventListener) {
        window.addEventListener('message', handleMessage, false);
        console.log('👂 Global message listener added');
    }
    
    // Function to create and inject the HeyGen iframe
    function createHeyGenEmbed() {
        console.log('🔍 Looking for HeyGen container...');
        
        // Look for the container by ID first
        var container = document.getElementById('heygen-streaming-embed');
        
        // If not found by ID, look for container with specific content
        if (!container) {
            var allDivs = document.getElementsByTagName('div');
            for (var i = 0; i < allDivs.length; i++) {
                if (allDivs[i].innerHTML && allDivs[i].innerHTML.indexOf('heygen-streaming-embed') > -1) {
                    container = allDivs[i];
                    break;
                }
            }
        }
        
        // If still not found, look in question text areas
        if (!container) {
            var questionContainers = document.querySelectorAll('.QuestionText, .QuestionBody, .Inner');
            for (var i = 0; i < questionContainers.length; i++) {
                var testDiv = questionContainers[i].querySelector('#heygen-streaming-embed');
                if (testDiv) {
                    container = testDiv;
                    break;
                }
            }
        }
        
        if (!container) {
            console.error('❌ HeyGen container not found! Make sure you have added the HTML container to your question.');
            return false;
        }
        
        console.log('✅ Found HeyGen container:', container);
        
        // Create the iframe
        var iframe = document.createElement('iframe');
        iframe.id = 'heygen-iframe';
        iframe.src = HEYGEN_EMBED_URL;
        iframe.style.width = '100%';
        iframe.style.height = '500px';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '8px';
        iframe.setAttribute('allow', 'microphone; camera; autoplay');
        iframe.setAttribute('allowfullscreen', 'true');
        iframe.setAttribute('title', 'HeyGen AI Avatar');
        
        // Clear container and add iframe
        container.innerHTML = '';
        container.appendChild(iframe);
        
        console.log('🎬 HeyGen iframe created and embedded');
        
        // Log session start
        handleTranscript({
            speaker: 'System',
            content: 'HeyGen avatar session started in Qualtrics survey',
            timestamp: new Date().toISOString(),
            metadata: {
                type: 'system_event',
                event: 'session_start',
                session_id: sessionId,
                response_id: responseId
            }
        });
        
        // Send initialization message to iframe after a delay
        setTimeout(function() {
            if (iframe.contentWindow) {
                var initMessage = {
                    type: 'init',
                    session_id: sessionId,
                    timestamp: new Date().toISOString(),
                    source: 'qualtrics_survey'
                };
                iframe.contentWindow.postMessage(initMessage, '*');
                console.log('📤 Sent initialization message to HeyGen iframe');
            }
        }, 3000);
        
        return true;
    }
    
    // Try to create embed immediately
    if (!createHeyGenEmbed()) {
        // If immediate creation fails, try after a delay
        console.log('⏳ Retrying HeyGen embed creation in 2 seconds...');
        setTimeout(function() {
            if (!createHeyGenEmbed()) {
                console.log('⏳ Final retry in 5 seconds...');
                setTimeout(createHeyGenEmbed, 5000);
            }
        }, 2000);
    }
});

// Cleanup when leaving the page
Qualtrics.SurveyEngine.addOnUnload(function() {
    console.log('🧹 Cleaning up HeyGen integration...');
    
    try {
        var finalSummary = {
            session_completed: true,
            total_messages: transcriptData.length || 0,
            session_end: new Date().toISOString()
        };
        Qualtrics.SurveyEngine.setEmbeddedData('transcript_session_summary', JSON.stringify(finalSummary));
        console.log('📊 Final session summary saved');
    } catch (error) {
        console.error('❌ Cleanup error:', error);
    }
});
