
/*
 * Qualtrics HeyGen AI Avatar Embed Script - Enhanced with Debugging
 * This script captures HeyGen avatar interactions and saves them to Supabase
 */

Qualtrics.SurveyEngine.addOnload(function() {
    // Store reference to this question
    var that = this;
    
    // Enhanced debugging
    console.log('=== HEYGEN QUALTRICS INTEGRATION START ===');
    console.log('Qualtrics Engine:', Qualtrics.SurveyEngine);
    console.log('Question ID:', that.questionId);
    
    // Supabase configuration
    var SUPABASE_URL = "https://xcznuookkehqcfcrhevq.supabase.co";
    var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhjem51b29ra2VocWNmY3JoZXZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4OTk4NzUsImV4cCI6MjA2NjQ3NTg3NX0.t9rsVefD7nElpgNiH9WGN5CymJrNL_KF_xNJFgNAeCg";
    
    // HeyGen embed configuration
    var HEYGEN_EMBED_URL = "https://labs.heygen.com/guest/streaming-embed?share=eyJxdWFsaXR5IjoiaGlnaCIsImF2YXRhck5hbWUiOiJKdW5lX0hSX3B1YmxpYyIsInByZXZpZXdJbWciOiJodHRwczovL2ZpbGVzMi5oZXlnZW4uYWkvYXZhdGFyL3YzLzc0NDQ3YTI3ODU5YTQ1NmM5NTVlMDFmMjFlZjE4MjE2XzQ1NjIwL3ByZXZpZXdfdGFsa18xLndlYnAiLCJuZWVkUmVtb3ZlQmFja2dyb3VuZCI6ZmFsc2UsImtub3dsZWRnZUJhc2VJZCI6ImFjODY1MWMzOWNlNTRiNTQ4NTkzOWRhZWM4YjdiZjRlIiwidXNlcm5hbWUiOiJhODQ1OTg5ZWY3NTY0NmY5OWZmY2RhOWNmMDMwMjVlNSJ9&inIFrame=1";
    
    // Generate unique session ID
    var sessionId = 'qualtrics_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    var responseId = Qualtrics.SurveyEngine.getResponseID();
    var transcriptData = [];
    
    console.log('Session ID:', sessionId);
    console.log('Response ID:', responseId);
    console.log('HeyGen URL:', HEYGEN_EMBED_URL);
    
    // Function to display error messages to user
    function showError(message, technical) {
        console.error('HEYGEN ERROR:', message, technical);
        var errorContainer = document.getElementById('heygen-error-display');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'heygen-error-display';
            errorContainer.style.cssText = 'background: #fee; border: 2px solid #fcc; border-radius: 8px; padding: 20px; margin: 20px 0; color: #c33;';
        }
        errorContainer.innerHTML = '<h4>Avatar Loading Error</h4><p>' + message + '</p>' + 
                                  (technical ? '<details><summary>Technical Details</summary><pre>' + technical + '</pre></details>' : '');
        
        // Try to find a container to show the error
        var containers = [
            document.getElementById('heygen-loading'),
            document.querySelector('.QuestionBody'),
            document.querySelector('.QuestionOuter'),
            document.body
        ];
        
        for (var i = 0; i < containers.length; i++) {
            if (containers[i]) {
                containers[i].appendChild(errorContainer);
                break;
            }
        }
    }
    
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
        
        console.log('Saving to Supabase:', requestBody);
        
        var xhr = new XMLHttpRequest();
        xhr.open('POST', SUPABASE_URL + '/rest/v1/transcripts', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
        xhr.setRequestHeader('Authorization', 'Bearer ' + SUPABASE_ANON_KEY);
        xhr.setRequestHeader('Prefer', 'return=minimal');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    console.log('✓ Supabase save successful:', transcriptEntry.speaker);
                } else {
                    console.error('✗ Supabase save failed:', xhr.status, xhr.responseText);
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
                messages: transcriptData.slice(-10)
            };
            
            Qualtrics.SurveyEngine.setEmbeddedData('transcript_data', JSON.stringify(transcriptSummary));
            console.log('✓ Updated Qualtrics Embedded Data');
        } catch (error) {
            console.error('✗ Error updating Qualtrics data:', error);
        }
    }
    
    // Function to handle transcript messages
    function handleTranscript(transcriptEntry) {
        transcriptData.push(transcriptEntry);
        saveToSupabase(transcriptEntry);
        updateQualtricsData();
        console.log('📝 Transcript:', transcriptEntry.speaker, '-', transcriptEntry.content.substring(0, 50) + '...');
    }
    
    // Enhanced message event listener
    function handleMessage(event) {
        console.log('📨 Message received:', {
            origin: event.origin,
            data: event.data,
            type: typeof event.data
        });
        
        // Security check with more detailed logging
        var isValidOrigin = event.origin.indexOf('heygen.com') !== -1 || 
                           event.origin.indexOf('labs.heygen.com') !== -1;
        
        if (!isValidOrigin) {
            console.log('⚠️ Message from invalid origin, ignoring:', event.origin);
            return;
        }
        
        if (event.data && typeof event.data === 'object') {
            var messageData = event.data;
            var type = messageData.type;
            var action = messageData.action;
            var data = messageData.data;
            var timestamp = new Date().toISOString();
            
            console.log('✓ Processing valid message:', { type: type, action: action });
            
            // Handle different message types with enhanced logging
            switch (type) {
                case 'transcript':
                case 'ai_response':
                case 'avatar_speech':
                    if (data && data.content) {
                        handleTranscript({
                            speaker: data.speaker || 'AI Avatar',
                            content: data.content,
                            timestamp: data.timestamp || timestamp,
                            metadata: mergeObjects({ type: type, source: 'heygen_avatar' }, data.metadata || {})
                        });
                    }
                    break;
                
                case 'user_message':
                case 'user_input':
                case 'user_speech':
                    if (data && (data.message || data.content)) {
                        handleTranscript({
                            speaker: 'User',
                            content: data.message || data.content,
                            timestamp: data.timestamp || timestamp,
                            metadata: mergeObjects({ type: type, source: 'user_input' }, data.metadata || {})
                        });
                    }
                    break;
                
                case 'conversation_start':
                    console.log('🎬 Conversation started');
                    handleTranscript({
                        speaker: 'System',
                        content: 'Conversation started in Qualtrics survey',
                        timestamp: timestamp,
                        metadata: mergeObjects({ type: 'system_event', event: 'conversation_start' }, data || {})
                    });
                    break;
                
                case 'streaming-embed':
                    console.log('🔧 HeyGen embed action:', action);
                    if (action === 'ready') {
                        console.log('✅ HeyGen avatar is ready!');
                        // Hide loading message
                        var loading = document.getElementById('heygen-loading');
                        if (loading) {
                            loading.style.display = 'none';
                        }
                        handleTranscript({
                            speaker: 'System',
                            content: 'HeyGen avatar ready for interaction',
                            timestamp: timestamp,
                            metadata: { type: 'system_event', event: 'avatar_ready' }
                        });
                    }
                    break;
                
                default:
                    console.log('❓ Unknown message type:', type, data);
            }
        }
    }
    
    // Add message listener
    window.addEventListener('message', handleMessage);
    console.log('📡 Message listener added');
    
    // Enhanced iframe creation function
    function createHeyGenEmbed() {
        console.log('🚀 Starting HeyGen embed creation...');
        
        // Enhanced container detection
        var questionContainer = null;
        var searchMethods = [];
        
        // Method 1: Question ID
        if (that.questionId) {
            var byId = document.getElementById(that.questionId);
            searchMethods.push({ method: 'getElementById', element: byId });
            if (byId && !questionContainer) questionContainer = byId;
        }
        
        // Method 2: Common Qualtrics selectors
        var selectors = [
            '.QuestionBody',
            '.QuestionText', 
            '.InnerInner',
            '.QuestionOuter .InnerInner',
            '#' + that.questionId + ' .QuestionBody',
            '#' + that.questionId + ' .QuestionText'
        ];
        
        for (var i = 0; i < selectors.length; i++) {
            var element = document.querySelector(selectors[i]);
            searchMethods.push({ method: 'querySelector(' + selectors[i] + ')', element: element });
            if (element && !questionContainer) {
                questionContainer = element;
                break;
            }
        }
        
        // Method 3: Qualtrics API
        try {
            var apiContainer = that.getQuestionContainer();
            searchMethods.push({ method: 'getQuestionContainer()', element: apiContainer });
            if (apiContainer && !questionContainer) questionContainer = apiContainer;
        } catch (e) {
            searchMethods.push({ method: 'getQuestionContainer()', error: e.message });
        }
        
        // Method 4: Fallback
        var fallback = document.querySelector('.QuestionOuter');
        searchMethods.push({ method: 'fallback(.QuestionOuter)', element: fallback });
        if (fallback && !questionContainer) questionContainer = fallback;
        
        console.log('🔍 Container search results:', searchMethods);
        
        if (!questionContainer) {
            var error = 'Could not find question container. Searched: ' + JSON.stringify(searchMethods);
            showError('Unable to find a place to display the avatar in your survey question.', error);
            return;
        }
        
        console.log('✅ Found container:', questionContainer);
        
        // Clear existing content
        questionContainer.innerHTML = '';
        
        // Create wrapper with enhanced styling
        var wrapper = document.createElement('div');
        wrapper.style.cssText = 'width: 100%; padding: 20px; text-align: center; font-family: Arial, sans-serif;';
        
        // Title
        var titleElement = document.createElement('h3');
        titleElement.textContent = 'AI Avatar Interview';
        titleElement.style.cssText = 'margin-bottom: 15px; color: #333; font-size: 24px; font-weight: bold;';
        wrapper.appendChild(titleElement);
        
        // Instructions
        var instructionElement = document.createElement('p');
        instructionElement.textContent = 'Please interact with the AI avatar below. Your conversation will be recorded and saved.';
        instructionElement.style.cssText = 'margin-bottom: 20px; color: #666; font-size: 16px; line-height: 1.4;';
        wrapper.appendChild(instructionElement);
        
        // Embed container
        var embedContainer = document.createElement('div');
        embedContainer.style.cssText = 'width: 100%; max-width: 800px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1); background: #f8f9fa; position: relative;';
        
        // Loading message with enhanced styling
        var loadingMessage = document.createElement('div');
        loadingMessage.id = 'heygen-loading';
        loadingMessage.innerHTML = '<div style="padding: 50px; color: #666;"><div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #ddd; border-top: 2px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 10px;"></div>Loading AI Avatar...</div>';
        loadingMessage.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(248, 249, 250, 0.95); display: flex; align-items: center; justify-content: center; z-index: 10;';
        
        // Debugging info (hidden by default)
        var debugInfo = document.createElement('div');
        debugInfo.id = 'heygen-debug';
        debugInfo.style.cssText = 'display: none; background: #f8f9fa; border: 1px solid #ddd; padding: 10px; margin: 10px 0; font-size: 12px; text-align: left;';
        debugInfo.innerHTML = '<strong>Debug Info:</strong><br>' +
                             'Session ID: ' + sessionId + '<br>' +
                             'Container: ' + (questionContainer.tagName || 'Unknown') + '<br>' +
                             'URL: ' + HEYGEN_EMBED_URL.substring(0, 100) + '...';
        
        // Create iframe with enhanced error handling
        var iframe = document.createElement('iframe');
        iframe.src = HEYGEN_EMBED_URL;
        iframe.allow = 'microphone; camera; autoplay; encrypted-media; fullscreen';
        iframe.style.cssText = 'width: 100%; height: 500px; border: none; display: block;';
        iframe.title = 'HeyGen AI Avatar';
        iframe.frameBorder = '0';
        iframe.allowFullscreen = false;
        
        console.log('🖼️ Creating iframe with src:', iframe.src);
        
        // Enhanced iframe event handlers
        iframe.onload = function() {
            console.log('✅ Iframe loaded successfully');
            
            // Send initialization message
            setTimeout(function() {
                try {
                    var initMessage = {
                        type: 'init',
                        session_id: sessionId,
                        timestamp: new Date().toISOString(),
                        source: 'qualtrics'
                    };
                    iframe.contentWindow.postMessage(initMessage, 'https://labs.heygen.com');
                    console.log('📤 Sent init message to iframe');
                } catch (e) {
                    console.warn('⚠️ Could not send init message:', e);
                }
            }, 2000);
            
            // Set up a timeout to show error if avatar doesn't load
            setTimeout(function() {
                var loading = document.getElementById('heygen-loading');
                if (loading && loading.style.display !== 'none') {
                    console.warn('⏰ Avatar loading timeout - showing debug info');
                    loading.innerHTML = '<div style="padding: 30px; color: #d63384;"><h4>Avatar Loading Issue</h4>' +
                                       '<p>The avatar is taking longer than expected to load.</p>' +
                                       '<button onclick="document.getElementById(\'heygen-debug\').style.display=\'block\';" style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Show Debug Info</button></div>';
                    
                    // Show debug info automatically after another 30 seconds
                    setTimeout(function() {
                        var debug = document.getElementById('heygen-debug');
                        if (debug) debug.style.display = 'block';
                    }, 30000);
                }
            }, 30000); // 30 second timeout
        };
        
        iframe.onerror = function(e) {
            console.error('❌ Iframe error:', e);
            showError('Failed to load the AI avatar. This might be due to network restrictions or the avatar service being unavailable.', 
                     'Error details: ' + JSON.stringify(e));
        };
        
        // Assemble the embed
        embedContainer.appendChild(iframe);
        embedContainer.appendChild(loadingMessage);
        wrapper.appendChild(embedContainer);
        wrapper.appendChild(debugInfo);
        questionContainer.appendChild(wrapper);
        
        console.log('✅ HeyGen embed created and inserted into DOM');
        
        // Test message posting capability
        setTimeout(function() {
            console.log('🧪 Testing postMessage capability...');
            try {
                iframe.contentWindow.postMessage({ type: 'test' }, '*');
                console.log('✅ postMessage test successful');
            } catch (e) {
                console.error('❌ postMessage test failed:', e);
                showError('Communication with the avatar failed. This might be due to browser security restrictions.', e.message);
            }
        }, 3000);
        
        // Log successful creation
        handleTranscript({
            speaker: 'System',
            content: 'Qualtrics survey session started with HeyGen integration - Enhanced Debug Version',
            timestamp: new Date().toISOString(),
            metadata: {
                type: 'system_event',
                event: 'qualtrics_session_start',
                debug_version: true,
                container_found: !!questionContainer
            }
        });
    }
    
    // Add CSS for loading animation
    var style = document.createElement('style');
    style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
    document.head.appendChild(style);
    
    // Execute embed creation
    console.log('⏱️ Creating embed immediately...');
    createHeyGenEmbed();
    
    // Backup attempt after delay
    setTimeout(function() {
        console.log('⏱️ Backup embed creation attempt...');
        if (!document.getElementById('heygen-loading') || document.getElementById('heygen-loading').style.display === 'none') {
            console.log('ℹ️ Embed already loaded, skipping backup');
        } else {
            console.log('🔄 Running backup embed creation');
            createHeyGenEmbed();
        }
    }, 2000);
    
    console.log('=== HEYGEN QUALTRICS INTEGRATION SETUP COMPLETE ===');
});

// Enhanced cleanup
Qualtrics.SurveyEngine.addOnunload(function() {
    console.log('🔚 Qualtrics HeyGen Integration - Session ending');
    
    try {
        var finalSummary = {
            session_completed: true,
            total_messages: (typeof transcriptData !== 'undefined') ? transcriptData.length : 0,
            session_end: new Date().toISOString()
        };
        Qualtrics.SurveyEngine.setEmbeddedData('transcript_session_summary', JSON.stringify(finalSummary));
        console.log('✅ Final summary saved');
    } catch (error) {
        console.error('❌ Cleanup error:', error);
    }
    
    if (typeof handleMessage !== 'undefined') {
        window.removeEventListener('message', handleMessage);
        console.log('🧹 Event listener removed');
    }
});
