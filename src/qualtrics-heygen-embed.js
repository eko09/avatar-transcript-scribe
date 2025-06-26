
/*
 * Qualtrics HeyGen AI Avatar Embed Script
 * This script captures HeyGen avatar interactions and saves them to Supabase
 * 
 * Instructions for Qualtrics:
 * 1. Add this script to your Qualtrics survey JavaScript
 * 2. Create an Embedded Data field called "transcript_data" in your survey flow
 * 3. Replace the HeyGen embed URL with your specific avatar configuration
 * 4. The script will automatically capture and store all interactions
 */

Qualtrics.SurveyEngine.addOnload(function() {
    // Store reference to this question
    var that = this;
    
    // Supabase configuration
    var SUPABASE_URL = "https://xcznuookkehqcfcrhevq.supabase.co";
    var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhjem51b29ra2VocWNmY3JoZXZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4OTk4NzUsImV4cCI6MjA2NjQ3NTg3NX0.t9rsVefD7nElpgNiH9WGN5CymJrNL_KF_xNJFgNAeCg";
    
    // HeyGen embed configuration - replace with your specific avatar URL
    var HEYGEN_EMBED_URL = "https://labs.heygen.com/guest/streaming-embed?share=eyJxdWFsaXR5IjoiaGlnaCIsImF2YXRhck5hbWUiOiJKdW5lX0hSX3B1YmxpYyIsInByZXZpZXdJbWciOiJodHRwczovL2ZpbGVzMi5oZXlnZW4uYWkvYXZhdGFyL3YzLzc0NDQ3YTI3ODU5YTQ1NmM5NTVlMDFmMjFlZjE4MjE2XzQ1NjIwL3ByZXZpZXdfdGFsa18xLndlYnAiLCJuZWVkUmVtb3ZlQmFja2dyb3VuZCI6ZmFsc2UsImtub3dsZWRnZUJhc2VJZCI6ImFjODY1MWMzOWNlNTRiNTQ4NTkzOWRhZWM4YjdiZjRlIiwidXNlcm5hbWUiOiJhODQ1OTg5ZWY3NTY0NmY5OWZmY2RhOWNmMDMwMjVlNSJ9&inIFrame=1";
    
    // Generate unique session ID for this survey response
    var sessionId = 'qualtrics_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    var responseId = Qualtrics.SurveyEngine.getResponseID();
    
    // Store for collecting transcript data
    var transcriptData = [];
    
    console.log('Qualtrics HeyGen Integration - Starting session:', sessionId);
    console.log('Qualtrics Response ID:', responseId);
    
    // Function to merge objects (replaces spread operator)
    function mergeObjects(target, source) {
        var result = {};
        for (var key in target) {
            if (target.hasOwnProperty(key)) {
                result[key] = target[key];
            }
        }
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                result[key] = source[key];
            }
        }
        return result;
    }
    
    // Function to save transcript to Supabase
    function saveToSupabase(transcriptEntry) {
        var metadata = mergeObjects(transcriptEntry.metadata || {}, {
            qualtrics_response_id: responseId,
            source: 'qualtrics_embed'
        });
        
        var requestBody = {
            session_id: sessionId,
            speaker: transcriptEntry.speaker,
            content: transcriptEntry.content,
            timestamp: transcriptEntry.timestamp,
            metadata: metadata
        };
        
        // Use XMLHttpRequest for compatibility
        var xhr = new XMLHttpRequest();
        xhr.open('POST', SUPABASE_URL + '/rest/v1/transcripts', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
        xhr.setRequestHeader('Authorization', 'Bearer ' + SUPABASE_ANON_KEY);
        xhr.setRequestHeader('Prefer', 'return=minimal');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    console.log('Successfully saved to Supabase:', transcriptEntry.speaker, transcriptEntry.content.substring(0, 50));
                } else {
                    console.error('Error saving to Supabase:', xhr.status, xhr.responseText);
                }
            }
        };
        
        xhr.send(JSON.stringify(requestBody));
    }
    
    // Function to update Qualtrics Embedded Data
    function updateQualtricsData() {
        try {
            var transcriptSummary = {
                session_id: sessionId,
                response_id: responseId,
                total_messages: transcriptData.length,
                last_updated: new Date().toISOString(),
                messages: transcriptData.slice(-10) // Keep last 10 messages to avoid data limits
            };
            
            // Set the embedded data field
            Qualtrics.SurveyEngine.setEmbeddedData('transcript_data', JSON.stringify(transcriptSummary));
            console.log('Updated Qualtrics Embedded Data');
        } catch (error) {
            console.error('Error updating Qualtrics data:', error);
        }
    }
    
    // Function to handle transcript messages
    function handleTranscript(transcriptEntry) {
        // Add to local storage
        transcriptData.push(transcriptEntry);
        
        // Save to Supabase
        saveToSupabase(transcriptEntry);
        
        // Update Qualtrics Embedded Data
        updateQualtricsData();
        
        console.log('Processed transcript:', transcriptEntry.speaker, '-', transcriptEntry.content.substring(0, 100));
    }
    
    // Message event listener for HeyGen iframe communication
    function handleMessage(event) {
        console.log('Received message:', event.data, 'from origin:', event.origin);
        
        // Security check - ensure message is from HeyGen
        if (event.origin.indexOf('heygen.com') === -1 && event.origin.indexOf('labs.heygen.com') === -1) {
            return;
        }
        
        if (event.data && typeof event.data === 'object') {
            var messageData = event.data;
            var type = messageData.type;
            var action = messageData.action;
            var data = messageData.data;
            var timestamp = new Date().toISOString();
            
            // Handle different types of messages from HeyGen
            switch (type) {
                case 'transcript':
                case 'ai_response':
                case 'avatar_speech':
                    if (data && data.content) {
                        var metadata = mergeObjects({
                            type: type,
                            source: 'heygen_avatar'
                        }, data.metadata || {});
                        
                        handleTranscript({
                            speaker: data.speaker || 'AI Avatar',
                            content: data.content,
                            timestamp: data.timestamp || timestamp,
                            metadata: metadata
                        });
                    }
                    break;
                
                case 'user_message':
                case 'user_input':
                case 'user_speech':
                    if (data && (data.message || data.content)) {
                        var metadata = mergeObjects({
                            type: type,
                            source: 'user_input'
                        }, data.metadata || {});
                        
                        handleTranscript({
                            speaker: 'User',
                            content: data.message || data.content,
                            timestamp: data.timestamp || timestamp,
                            metadata: metadata
                        });
                    }
                    break;
                
                case 'conversation_start':
                    var metadata = mergeObjects({
                        type: 'system_event',
                        event: 'conversation_start',
                        qualtrics_response_id: responseId
                    }, data || {});
                    
                    handleTranscript({
                        speaker: 'System',
                        content: 'Conversation started in Qualtrics survey',
                        timestamp: timestamp,
                        metadata: metadata
                    });
                    break;
                
                case 'conversation_end':
                    var metadata = mergeObjects({
                        type: 'system_event',
                        event: 'conversation_end',
                        qualtrics_response_id: responseId,
                        total_messages: transcriptData.length
                    }, data || {});
                    
                    handleTranscript({
                        speaker: 'System',
                        content: 'Conversation ended in Qualtrics survey',
                        timestamp: timestamp,
                        metadata: metadata
                    });
                    break;
                
                case 'streaming-embed':
                    console.log('HeyGen streaming embed action:', action);
                    if (action === 'ready') {
                        handleTranscript({
                            speaker: 'System',
                            content: 'HeyGen avatar ready for interaction',
                            timestamp: timestamp,
                            metadata: {
                                type: 'system_event',
                                event: 'avatar_ready',
                                qualtrics_response_id: responseId
                            }
                        });
                    }
                    break;
                
                default:
                    console.log('Unknown HeyGen message type:', type, data);
            }
        }
    }
    
    // Add the message event listener
    window.addEventListener('message', handleMessage);
    
    // Function to create and inject the HeyGen iframe
    function createHeyGenEmbed() {
        console.log('Creating HeyGen embed...');
        
        // Try multiple methods to find the question container
        var questionContainer = null;
        
        // Method 1: Try to find by question ID
        if (that.questionId) {
            questionContainer = document.getElementById(that.questionId);
            console.log('Method 1 - Found container by ID:', questionContainer);
        }
        
        // Method 2: Try common Qualtrics question selectors
        if (!questionContainer) {
            var selectors = [
                '.QuestionBody',
                '.QuestionText',
                '.InnerInner',
                '.QuestionOuter .InnerInner',
                '#' + that.questionId + ' .QuestionBody',
                '#' + that.questionId + ' .QuestionText'
            ];
            
            for (var i = 0; i < selectors.length; i++) {
                questionContainer = document.querySelector(selectors[i]);
                if (questionContainer) {
                    console.log('Method 2 - Found container with selector:', selectors[i]);
                    break;
                }
            }
        }
        
        // Method 3: Get the question element directly from Qualtrics engine
        if (!questionContainer) {
            try {
                questionContainer = that.getQuestionContainer();
                console.log('Method 3 - Found container via getQuestionContainer:', questionContainer);
            } catch (e) {
                console.log('Method 3 failed:', e);
            }
        }
        
        // Method 4: Fallback to any question container
        if (!questionContainer) {
            questionContainer = document.querySelector('.QuestionOuter');
            console.log('Method 4 - Fallback container:', questionContainer);
        }
        
        if (!questionContainer) {
            console.error('Could not find question container for HeyGen embed');
            return;
        }
        
        // Clear any existing content in the question
        questionContainer.innerHTML = '';
        
        // Create the main wrapper
        var wrapper = document.createElement('div');
        wrapper.style.cssText = 'width: 100%; padding: 20px; text-align: center;';
        
        // Create title
        var titleElement = document.createElement('h3');
        titleElement.textContent = 'AI Avatar Interview';
        titleElement.style.cssText = 'margin-bottom: 15px; color: #333; font-size: 24px; font-weight: bold;';
        wrapper.appendChild(titleElement);
        
        // Create instructions
        var instructionElement = document.createElement('p');
        instructionElement.textContent = 'Please interact with the AI avatar below. Your conversation will be automatically recorded and saved.';
        instructionElement.style.cssText = 'margin-bottom: 20px; color: #666; font-size: 16px; line-height: 1.4;';
        wrapper.appendChild(instructionElement);
        
        // Create container for the embed
        var embedContainer = document.createElement('div');
        embedContainer.style.cssText = 'width: 100%; max-width: 800px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1); background: #f8f9fa; padding: 10px;';
        
        // Create iframe
        var iframe = document.createElement('iframe');
        iframe.src = HEYGEN_EMBED_URL;
        iframe.allow = 'microphone';
        iframe.style.cssText = 'width: 100%; height: 500px; border: none; border-radius: 8px; display: block;';
        iframe.title = 'HeyGen AI Avatar';
        iframe.frameBorder = '0';
        iframe.allowFullscreen = false;
        
        // Add loading message
        var loadingMessage = document.createElement('div');
        loadingMessage.textContent = 'Loading AI Avatar...';
        loadingMessage.style.cssText = 'text-align: center; padding: 50px; color: #666; font-size: 16px;';
        loadingMessage.id = 'heygen-loading';
        
        embedContainer.appendChild(loadingMessage);
        embedContainer.appendChild(iframe);
        wrapper.appendChild(embedContainer);
        
        // Insert the wrapper into the question container
        questionContainer.appendChild(wrapper);
        
        console.log('HeyGen embed HTML created and inserted');
        
        // Handle iframe load
        iframe.onload = function() {
            console.log('HeyGen iframe loaded successfully');
            // Hide loading message
            var loading = document.getElementById('heygen-loading');
            if (loading) {
                loading.style.display = 'none';
            }
            
            // Send initialization message after iframe loads
            setTimeout(function() {
                var initMessage = {
                    type: 'init',
                    session_id: sessionId,
                    timestamp: new Date().toISOString(),
                    source: 'qualtrics'
                };
                
                try {
                    iframe.contentWindow.postMessage(initMessage, 'https://labs.heygen.com');
                    console.log('Sent initialization message to iframe');
                } catch (e) {
                    console.log('Could not send init message:', e);
                }
            }, 2000);
        };
        
        // Handle iframe errors
        iframe.onerror = function() {
            console.error('Error loading HeyGen iframe');
            loadingMessage.textContent = 'Error loading AI Avatar. Please refresh the page.';
            loadingMessage.style.color = '#d32f2f';
        };
        
        console.log('HeyGen embed setup completed');
    }
    
    // Create the embed immediately
    createHeyGenEmbed();
    
    // Also try after a short delay in case the DOM isn't fully ready
    setTimeout(createHeyGenEmbed, 500);
    
    // Log session start
    handleTranscript({
        speaker: 'System',
        content: 'Qualtrics survey session started with HeyGen integration',
        timestamp: new Date().toISOString(),
        metadata: {
            type: 'system_event',
            event: 'qualtrics_session_start',
            qualtrics_response_id: responseId,
            session_id: sessionId
        }
    });
});

// Clean up on page unload
Qualtrics.SurveyEngine.addOnunload(function() {
    console.log('Qualtrics HeyGen Integration - Session ending');
    
    // Final update to embedded data
    try {
        var finalSummary = {
            session_completed: true,
            total_messages: (typeof transcriptData !== 'undefined') ? transcriptData.length : 0,
            session_end: new Date().toISOString()
        };
        Qualtrics.SurveyEngine.setEmbeddedData('transcript_session_summary', JSON.stringify(finalSummary));
    } catch (error) {
        console.error('Error in cleanup:', error);
    }
    
    // Remove event listener
    if (typeof handleMessage !== 'undefined') {
        window.removeEventListener('message', handleMessage);
    }
});
