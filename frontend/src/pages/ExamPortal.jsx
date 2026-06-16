import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Eye, AlertTriangle, Send, Clock, UserCheck, Maximize2 } from 'lucide-react';
import { initiateSocketConnection, disconnectSocket, joinExamRoom, sendHeartbeat } from '../services/socket';
import API from '../services/api';
import Editor from '@monaco-editor/react';

const ExamPortal = () => {
  const { examId, attemptId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  
  // Selected answers: { [questionId]: optionText }
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  
  // Proctor State
  const [warningsCount, setWarningsCount] = useState(0);
  const [suspicionScore, setSuspicionScore] = useState(0);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [sandboxLocked, setSandboxLocked] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');
  const [simulatedCheat, setSimulatedCheat] = useState(null); // 'phone', 'multi_people', null
  const [simulationLog, setSimulationLog] = useState('');
  
  // Real TensorFlow Model States
  const [model, setModel] = useState(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [detections, setDetections] = useState([]);

  // Load TensorFlow and COCO-SSD scripts dynamically via CDN
  useEffect(() => {
    let tfScript = document.getElementById('tfjs-script');
    let cocoScript = document.getElementById('coco-script');

    const loadScripts = async () => {
      try {
        if (!tfScript) {
          tfScript = document.createElement('script');
          tfScript.id = 'tfjs-script';
          tfScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs';
          tfScript.async = true;
          document.body.appendChild(tfScript);
        }

        await new Promise((resolve) => {
          if (window.tf) {
            resolve();
          } else {
            tfScript.onload = resolve;
          }
        });

        if (!cocoScript) {
          cocoScript = document.createElement('script');
          cocoScript.id = 'coco-script';
          cocoScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd';
          cocoScript.async = true;
          document.body.appendChild(cocoScript);
        }

        await new Promise((resolve) => {
          if (window.cocoSsd) {
            resolve();
          } else {
            cocoScript.onload = resolve;
          }
        });

        console.log("TensorFlow.js and COCO-SSD loaded!");
        const loadedModel = await window.cocoSsd.load({ base: 'lite_mobilenet_v2' });
        setModel(loadedModel);
        setModelLoading(false);
      } catch (err) {
        console.error("Failed to load object detection models:", err);
        setModelLoading(false);
      }
    };

    loadScripts();
  }, []);

  // Warning Banner modal
  const [warningAlert, setWarningAlert] = useState(null); // { type, message, warningNumber }

  const handleSimulatePhone = () => {
    setSimulatedCheat('phone');
    setSimulationLog('Proctor AI: Analyzing camera frame... Cell phone object detected.');
    setTimeout(() => {
      setSandboxLocked(true);
      setTerminationReason('Exam terminated automatically. Reason: Cell phone detection violation in webcam feed.');
      submitTest(true, false, 'Mobile phone detected in webcam feed');
    }, 2000);
  };

  const handleSimulateMultiPeople = () => {
    setSimulatedCheat('multi_people');
    setSimulationLog('Proctor AI: Analyzing camera frame... Multiple people detected.');
    setTimeout(() => {
      setSandboxLocked(true);
      setTerminationReason('Exam terminated automatically. Reason: Multiple people detected in webcam feed.');
      submitTest(true, false, 'Multiple people detected in webcam feed');
    }, 2000);
  };

  // Hardware webcam and computer vision state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameraStatus, setCameraStatus] = useState('initializing'); // 'initializing', 'present', 'blocked', 'absent'
  const [localViolationStreak, setLocalViolationStreak] = useState(0);
  const [diagnosticsBypassed, setDiagnosticsBypassed] = useState(false);

  // Diagnostics / Canvas / Video refs
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const animationRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const localViolationStreakRef = useRef(0);
  const warmUpFramesRef = useRef(0);

  // 1. Fetch Exam Data & Start Socket
  useEffect(() => {
    const startPortal = async () => {
      try {
        const res = await API.get(`/exams/${examId}`);
        setExam(res.data.exam);
        setQuestions(res.data.questions || []);
        setTimeLeft(res.data.exam.duration * 60);

        // Start Socket
        const token = localStorage.getItem('trinetra_token');
        if (token) {
          const socket = initiateSocketConnection(token);
          
          socket.on('connect', () => {
            joinExamRoom(examId);
          });

          // Listen for Warnings
          socket.on('warning_issued', ({ type, message, warningNumber }) => {
            setWarningsCount(warningNumber);
            setWarningAlert({ type, message, warningNumber });
            
            // Auto hide warning alert modal after 5 seconds
            setTimeout(() => {
              setWarningAlert(null);
            }, 5000);
          });

          // Listen for Auto Submission
          socket.on('auto_submit', ({ reason }) => {
            setSandboxLocked(true);
            setTerminationReason(reason);
            // Execute quick submit
            submitTest(true);
          });

          // Heartbeat interval (every 15s)
          heartbeatIntervalRef.current = setInterval(() => {
            sendHeartbeat(examId);
          }, 15000);
        }
      } catch (err) {
        alert("Failed to initialize exam gateway: " + err.message);
        navigate('/dashboard');
      }
    };

    startPortal();

    return () => {
      disconnectSocket();
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [examId, attemptId]);

  // 2. Hardware Webcam Stream Acquisition
  useEffect(() => {
    let activeStream = null;

    const acquireWebcam = async () => {
      try {
        setCameraStatus('initializing');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' }
        });
        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
        setCameraError(null);
      } catch (err) {
        setCameraActive(false);
        setCameraStatus('blocked');
        setCameraError('Camera access denied or hardware not found. You must enable webcam permissions to proceed.');
        reportViolation('camera_blocked');
      }
    };

    acquireWebcam();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 3. Fullscreen and Gaze Interception
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && !sandboxLocked) {
        // Tab Switched! Log violation
        await reportViolation('tab_switch');
      }
    };

    const handleFullscreenChange = async () => {
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
      setFullscreenActive(isFs);
      if (!isFs && !sandboxLocked) {
        // Exited Fullscreen! Log violation
        await reportViolation('fullscreen_exit');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [sandboxLocked]);

  // 4. Countdown Timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          submitTest(false, true); // Auto submit on timer exhaustion
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // 5. Real-Time Hardware Proctoring & Computer Vision Feed analysis
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    let frame = 0;

    const render = () => {
      frame++;

      if (model && frame % 12 === 0 && cameraActive && videoRef.current && videoRef.current.readyState >= 2) {
        model.detect(videoRef.current).then(predictions => {
          setDetections(predictions);
          
          // Check for cell phone
          const cellPhone = predictions.find(p => p.class === 'cell phone');
          if (cellPhone && cellPhone.score > 0.45) {
            reportViolation('mobile_detected');
            setSandboxLocked(true);
            setTerminationReason('Exam terminated automatically due to cell phone detection in webcam feed.');
            submitTest(true, false, 'Mobile phone detected in webcam feed');
          }

          // Check for multiple people
          const people = predictions.filter(p => p.class === 'person');
          if (people.length > 1) {
            reportViolation('multiple_faces');
          } else if (people.length === 0) {
            reportViolation('no_face_detected');
          }
        }).catch(err => console.error("Detection error:", err));
      }
      
      if (!cameraActive || !videoRef.current || videoRef.current.readyState < 2) {
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw HUD grid
        ctx.strokeStyle = 'rgba(14, 165, 233, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 20) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, canvas.height);
          ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += 20) {
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(canvas.width, i);
          ctx.stroke();
        }

        ctx.fillStyle = 'var(--danger)';
        ctx.font = '8px monospace';
        ctx.fillText("WAITING FOR SECURED CAMERA FEED...", canvas.width / 2 - 80, canvas.height / 2);
      } else {
        // Draw the real time active webcamera frames onto the HUD canvas
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        // Count hardware frames for warm-up grace period
        warmUpFramesRef.current++;
        
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          
          let totalLuminance = 0;
          let skinPixelCount = 0;
          let sumX = 0;
          let sumY = 0;
          
          // Broad and lighting-tolerant skin color filter
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            
            // Calculate pixel brightness
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            totalLuminance += lum;
            
            // Inclusive color boundaries optimized for lighting variance
            if (r > 60 && g > 25 && b > 15 && r > g && r > b - 15) {
              skinPixelCount++;
              const pixelIdx = i / 4;
              sumX += pixelIdx % canvas.width;
              sumY += Math.floor(pixelIdx / canvas.width);
              
              // Neon visual indicator highlights
              if (Math.random() < 0.08) {
                data[i] = Math.min(255, data[i] + 30);
                data[i+1] = Math.min(255, data[i+1] + 10);
                data[i+2] = Math.min(255, data[i+2] + 90);
              }
            }
          }
          
          // Render skin-highlight highlights
          ctx.putImageData(imgData, 0, 0);
          
          const totalPixels = canvas.width * canvas.height;
          const avgLuminance = totalLuminance / totalPixels;
          const skinRatio = skinPixelCount / totalPixels;
          
          // Warmup Grace Period Check (skip analysis first 60 frames to allow hardware auto-exposure)
          if (warmUpFramesRef.current < 60) {
            setCameraStatus('present');
            ctx.fillStyle = '#0ea5e9';
            ctx.font = 'bold 8px monospace';
            ctx.fillText("WARMING UP FEED: " + Math.round((warmUpFramesRef.current / 60) * 100) + "%", 15, canvas.height - 40);
          } else {
            // 1. Safe Covered-lens block detection (extremely dark < 4.0)
            if (avgLuminance < 4.0) {
              setCameraStatus('blocked');
              localViolationStreakRef.current++;
              if (localViolationStreakRef.current > 60) { // ~4 seconds at 15 FPS
                reportViolation('camera_blocked');
                localViolationStreakRef.current = 0;
              }
            } 
            // 2. Safe Candidate Absence detection (extremely small threshold < 0.005)
            else if (skinRatio < 0.005) {
              setCameraStatus('absent');
              localViolationStreakRef.current++;
              if (localViolationStreakRef.current > 60) {
                reportViolation('no_face_detected');
                localViolationStreakRef.current = 0;
              }
            } 
            // 3. Candidate Present detection (Nominal State)
            else {
              setCameraStatus('present');
              localViolationStreakRef.current = 0;
              
              if (detections && detections.length > 0) {
                detections.forEach(pred => {
                  const [x, y, width, height] = pred.bbox;
                  
                  // Scale bbox to fit the canvas dimensions
                  const scaleX = canvas.width / (videoRef.current.videoWidth || 320);
                  const scaleY = canvas.height / (videoRef.current.videoHeight || 240);
                  const scaledX = x * scaleX;
                  const scaledY = y * scaleY;
                  const scaledWidth = width * scaleX;
                  const scaledHeight = height * scaleY;

                  const isViolation = pred.class === 'cell phone' || (pred.class === 'person' && detections.filter(p => p.class === 'person').length > 1 && pred !== detections.find(p => p.class === 'person'));
                  
                  ctx.strokeStyle = isViolation ? '#ef4444' : '#10b981'; // red for violation, cyber emerald for OK
                  ctx.lineWidth = 1.5;
                  ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

                  // Label background box
                  ctx.fillStyle = isViolation ? 'rgba(239, 68, 68, 0.85)' : 'rgba(16, 185, 129, 0.85)';
                  ctx.fillRect(scaledX, scaledY - 14, scaledWidth, 14);

                  // Label text
                  ctx.fillStyle = '#ffffff';
                  ctx.font = 'bold 8px monospace';
                  const label = `${pred.class.toUpperCase()} (${Math.round(pred.score * 100)}%)`;
                  ctx.fillText(label, scaledX + 4, scaledY - 4);
                });
              } else {
                // Calculate face centroid coordinates
                const centerX = sumX / skinPixelCount;
                const centerY = sumY / skinPixelCount;
                
                // Draw targeting frame box on canvas
                ctx.strokeStyle = '#10b981'; // Cyber emerald
                ctx.lineWidth = 1.5;
                ctx.strokeRect(centerX - 40, centerY - 45, 80, 90);
                
                // Targeting HUD labels
                ctx.fillStyle = '#10b981';
                ctx.font = 'bold 7px monospace';
                ctx.fillText("TARGET: ACTIVE CANDIDATE", centerX - 42, centerY - 50);
                
                // Center reticle
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
                ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
                ctx.stroke();
              }
            }
          }

          // Simulated cheat bounding boxes
          if (simulatedCheat === 'phone') {
            ctx.strokeStyle = '#ef4444'; // Red
            ctx.lineWidth = 2;
            ctx.strokeRect(150, 110, 50, 60);
            
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 7px monospace';
            ctx.fillText("ALERT: MOBILE PHONE DETECTED (98%)", 130, 105);
            
            ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
            ctx.fillRect(150, 110, 50, 60);
          } else if (simulatedCheat === 'multi_people') {
            ctx.strokeStyle = '#ef4444'; // Red
            ctx.lineWidth = 2;
            ctx.strokeRect(30, 45, 65, 80);
            
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 7px monospace';
            ctx.fillText("ALERT: SECONDARY PERSON DETECTED", 20, 40);
            
            ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
            ctx.fillRect(30, 45, 65, 80);
          }
          
        } catch (e) {
          console.error("Frame CV analysis failed:", e);
        }
      }
      
      // Cyber HUD grid elements
      ctx.fillStyle = '#0ea5e9';
      ctx.font = 'bold 7.5px monospace';
      ctx.fillText("PROCTOR AI DIGITAL SECURE PORTAL", 10, 16);

      if (modelLoading) {
        ctx.fillStyle = 'rgba(234, 179, 8, 0.9)';
        ctx.font = 'bold 7px monospace';
        ctx.fillText("AI ENGINE: RUNNING DUAL-STAGE CALIBRATION...", 10, 26);
      } else {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
        ctx.font = 'bold 7px monospace';
        ctx.fillText("AI ENGINE: ACTIVE (COCO-SSD INTEGRITY ON)", 10, 26);
      }
      
      // Aiming scanning line overlay
      const lineY = (canvas.height / 2) + Math.sin(frame * 0.04) * 80;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.25)';
      ctx.moveTo(10, lineY);
      ctx.lineTo(canvas.width - 10, lineY);
      ctx.stroke();
      
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '6px monospace';
      ctx.fillText(`INTEGRITY RATE: ${100 - suspicionScore}%`, 10, canvas.height - 25);
      ctx.fillText(`FEED METRIC: ${cameraStatus.toUpperCase()}`, 10, canvas.height - 15);
      
      animationRef.current = requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [cameraActive, suspicionScore, cameraStatus, simulatedCheat, detections, model]);

  // Request fullscreen wrapper
  const triggerFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    }
  };

  // Log a proctor violation to the backend
  const reportViolation = async (type) => {
    try {
      const res = await API.post('/proctoring/violation', {
        attemptId,
        type,
        evidenceImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80'
      });

      setSuspicionScore(res.data.suspicionScore);
      if (res.data.autoSubmitTriggered) {
        setSandboxLocked(true);
        setTerminationReason('System auto-submission triggered due to excessive proctoring violations.');
      }
    } catch (e) {
      console.error('Error logging violation:', e.message);
    }
  };

  // Submit test Answers
  const submitTest = async (isAuto = false, isTimeout = false, customReason = null) => {
    try {
      const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => {
        if (typeof answer === 'object' && answer.code !== undefined) {
          return {
            questionId,
            answer: answer.code,
            marksObtained: answer.scoreObtained || 0
          };
        }
        return {
          questionId,
          answer
        };
      });

      let finalReason = customReason;
      if (!finalReason) {
        if (isTimeout) finalReason = 'Exam session time limit expired';
        else if (isAuto) finalReason = 'Auto submitted due to excessive proctoring violations';
        else finalReason = 'Standard manual submission';
      }

      await API.post('/attempts/submit', {
        attemptId,
        answers: formattedAnswers,
        isAutoSubmit: isAuto || isTimeout,
        submissionReason: finalReason
      });

      // Exit fullscreen if active
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch (err) {
          console.error("Fullscreen exit error:", err);
        }
      }

      // Navigate to results
      navigate(`/exam-result/${attemptId}`);
    } catch (e) {
      alert("Submission error: " + e.message);
    }
  };

  // MCQ selection
  const handleAnswerSelect = (optionText) => {
    const qId = questions[currentIdx]?._id;
    if (qId) {
      setAnswers({
        ...answers,
        [qId]: optionText
      });
    }
  };

  // Format Timer
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentIdx];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#070a12' }}>
      
      {/* Real hardware camera receiver */}
      <video ref={videoRef} autoPlay playsInline muted style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }} />

      {/* Real-time Hardware Proctoring Alerts Lock Mask */}
      {(cameraStatus === 'blocked' || cameraStatus === 'absent' || cameraError) && !sandboxLocked && !diagnosticsBypassed && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(7, 10, 18, 0.98)',
          backdropFilter: 'blur(30px)',
          zIndex: 9998,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '24px'
        }}>
          <AlertTriangle size={72} style={{ color: 'var(--danger)', marginBottom: '24px', filter: 'drop-shadow(0 0 15px var(--danger-glow))', animation: 'pulse 1.5s infinite' }} />
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--danger)', marginBottom: '12px', letterSpacing: '0.05em' }}>
            SECURED GATEWAY LOCKDOWN
          </h2>
          <p style={{ color: '#fff', maxWidth: '560px', fontSize: '1.05rem', fontWeight: 700, lineHeight: '1.6', marginBottom: '16px' }}>
            {cameraStatus === 'blocked' && "⚠️ CRITICAL: Web camera lens is blocked, covered, or too dark! Please unblock your lens immediately."}
            {cameraStatus === 'absent' && "⚠️ CRITICAL: Candidate presence not detected in front of the screen!"}
            {cameraError && `⚠️ CRITICAL: ${cameraError}`}
          </p>
          <p style={{ color: 'var(--text-muted)', maxWidth: '460px', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '32px' }}>
            To satisfy exam security policies, you must remain fully visible and present within the active web camera feed. Question selection or progression is disabled while this alert remains active.
          </p>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div className="glass-panel" style={{
              padding: '10px 20px',
              borderColor: 'var(--danger)',
              background: 'rgba(244,63,94,0.05)',
              fontSize: '0.8rem',
              color: 'var(--danger)',
              fontWeight: 700,
              borderRadius: '6px'
            }}>
              SECURITY AUDIT STREAM ENGAGED
            </div>
            
            <button 
              onClick={() => setDiagnosticsBypassed(true)}
              className="btn-cyber-secondary"
              style={{
                padding: '10px 20px',
                fontSize: '0.8rem',
                borderColor: 'var(--primary)',
                color: 'var(--primary)',
                background: 'rgba(14,165,233,0.05)',
                fontWeight: 700,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Calibrate & Bypass Lock
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Guard Mask */}
      {!fullscreenActive && !sandboxLocked && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(7, 10, 18, 0.95)',
          backdropFilter: 'blur(20px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '24px'
        }}>
          <Shield size={64} style={{ color: 'var(--primary)', marginBottom: '24px', filter: 'drop-shadow(0 0 15px var(--primary-glow))' }} />
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
            Secured Sandbox Access Required
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '440px', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '32px' }}>
            To protect testing integrity, this exam must be taken in a locked fullscreen environment. Leaving this mode logs a severe violation.
          </p>
          <button 
            onClick={triggerFullscreen} 
            className="btn-cyber"
            style={{ padding: '16px 36px', fontSize: '1rem' }}
          >
            <Maximize2 size={18} />
            Authorize Fullscreen Lock
          </button>
        </div>
      )}

      {/* Proctor AI Lockout Mask */}
      {sandboxLocked && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: '#070a12',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '24px'
        }}>
          <AlertTriangle size={64} style={{ color: 'var(--danger)', marginBottom: '24px', filter: 'drop-shadow(0 0 20px var(--danger-glow))' }} />
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--danger)', marginBottom: '12px' }}>
            TEST TERMINATED BY PROCTOR AI
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '480px', fontSize: '1rem', lineHeight: '1.6', marginBottom: '32px' }}>
            {terminationReason || 'Your assessment has been automatically locked and submitted due to multiple tab-switching or gaze violations.'}
          </p>
          <button 
            onClick={() => navigate(`/exam-result/${attemptId}`)}
            className="btn-cyber-danger"
            style={{ padding: '16px 32px' }}
          >
            Retrieve Assessment Receipt
          </button>
        </div>
      )}

      {/* Warning popup alert modal */}
      {warningAlert && (
        <div style={{
          position: 'fixed',
          top: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '550px',
          background: 'rgba(244, 63, 94, 0.95)',
          border: '2px solid #fff',
          borderRadius: '12px',
          padding: '16px 24px',
          zIndex: 10001,
          boxShadow: '0 0 30px rgba(244, 63, 94, 0.6)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          animation: 'shake 0.5s ease-out'
        }}>
          <style>{`
            @keyframes shake {
              0%, 100% { transform: translateX(-50%); }
              10%, 30%, 50%, 70%, 90% { transform: translateX(-52%); }
              20%, 40%, 60%, 80% { transform: translateX(-48%); }
            }
          `}</style>
          <AlertTriangle size={32} style={{ color: '#fff', flexShrink: 0 }} />
          <div>
            <h4 style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', textTransform: 'uppercase' }}>
              PROCTOR WARNING #{warningAlert.warningNumber} RECEIVED
            </h4>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.8rem', marginTop: '2px' }}>
              {warningAlert.message}
            </p>
          </div>
        </div>
      )}

      {/* Main Secured Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 2fr', flex: 1, minHeight: '100vh' }}>
        
        {/* SECURED COLUMN 1: TESTING PLAYER */}
        <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          
          {/* Top Info Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
            <div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>{exam ? exam.title : 'Resolving Exam...'}</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Attempt Reference ID: {attemptId}</span>
            </div>
            <div className="glass-panel" style={{
              padding: '10px 24px',
              borderColor: 'var(--primary)',
              background: 'rgba(14,165,233,0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              borderRadius: '10px'
            }}>
              <Clock size={18} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '1.25rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--primary)' }}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {/* Question Screen */}
          {questions.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0' }}>
              Loading curated exam questions...
            </div>
          ) : currentQ ? (
            <div className="glass-panel" style={{ padding: '36px', minHeight: '360px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700 }}>
                    Question {currentIdx + 1} of {questions.length}
                  </span>
                  <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                    {currentQ.marks} marks
                  </span>
                </div>

                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginBottom: '28px', lineHeight: '1.5' }}>
                  {currentQ.question}
                </h3>

                {/* Options grid or Coding Area */}
                {currentQ.type === 'coding' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', height: '350px' }}>
                      <Editor
                        height="100%"
                        defaultLanguage="javascript"
                        theme="vs-dark"
                        value={answers[currentQ._id]?.code || ''}
                        onChange={(value) => setAnswers({
                          ...answers,
                          [currentQ._id]: { ...answers[currentQ._id], code: value }
                        })}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          padding: { top: 16 }
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button
                        onClick={async () => {
                          try {
                            const res = await API.post('/exams/evaluate-code', {
                              questionId: currentQ._id,
                              studentCode: answers[currentQ._id]?.code
                            });
                            setAnswers({
                              ...answers,
                              [currentQ._id]: {
                                code: answers[currentQ._id]?.code,
                                scoreObtained: res.data.scoreObtained,
                                feedback: res.data.feedback,
                                testCasesPassed: res.data.testCasesPassed
                              }
                            });
                            alert(`Code Evaluated!\nScore: ${res.data.scoreObtained}/${res.data.maxMarks}\nTest Cases: ${res.data.testCasesPassed}/${res.data.totalTestCases}\nFeedback: ${res.data.feedback}`);
                          } catch (err) {
                            alert(err.response?.data?.message || 'Evaluation failed');
                          }
                        }}
                        className="btn-cyber"
                        style={{ padding: '8px 16px' }}
                      >
                        Evaluate Code (AI)
                      </button>
                    </div>
                    {answers[currentQ._id]?.feedback && (
                      <div className="glass-panel" style={{ padding: '12px', background: 'rgba(16,185,129,0.1)', borderColor: 'var(--success)' }}>
                        <h4 style={{ color: 'var(--success)', marginBottom: '8px', fontSize: '0.9rem' }}>AI Evaluation Result:</h4>
                        <p style={{ color: '#fff', fontSize: '0.85rem' }}>Score: {answers[currentQ._id].scoreObtained}</p>
                        <p style={{ color: '#fff', fontSize: '0.85rem' }}>Test Cases Passed: {answers[currentQ._id].testCasesPassed}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>{answers[currentQ._id].feedback}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {currentQ.options && currentQ.options.map((opt, oidx) => {
                      const isSelected = answers[currentQ._id] === opt.text;
                      return (
                        <button
                          key={oidx}
                          onClick={() => handleAnswerSelect(opt.text)}
                          className="glass-panel"
                          style={{
                            width: '100%',
                            padding: '16px 20px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(14,165,233,0.1)' : 'rgba(255,255,255,0.01)',
                            borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                            color: isSelected ? '#fff' : 'var(--text-muted)',
                            fontSize: '0.9rem',
                            fontWeight: isSelected ? 700 : 500,
                            transition: 'var(--transition-smooth)'
                          }}
                        >
                          <span style={{
                            display: 'inline-block',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--text-dark)'}`,
                            background: isSelected ? 'var(--primary)' : 'transparent',
                            color: isSelected ? '#000' : 'var(--text-muted)',
                            textAlign: 'center',
                            lineHeight: '22px',
                            marginRight: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            {String.fromCharCode(65 + oidx)}
                          </span>
                          {opt.text}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Navigation buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                <button
                  onClick={() => setCurrentIdx(prev => Math.max(prev - 1, 0))}
                  disabled={currentIdx === 0}
                  className="btn-cyber-secondary"
                  style={{ opacity: currentIdx === 0 ? 0.4 : 1 }}
                >
                  Previous Item
                </button>
                
                {currentIdx < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIdx(prev => prev + 1)}
                    className="btn-cyber"
                  >
                    Next Question
                  </button>
                ) : (
                  <button
                    onClick={() => submitTest()}
                    className="btn-cyber"
                    style={{ background: 'linear-gradient(135deg, var(--success) 0%, #047857 100%)', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}
                  >
                    <Send size={16} />
                    Finalize & Submit Exam
                  </button>
                )}
              </div>
            </div>
          ) : null}

          {/* Quick links to questions */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '32px'
          }}>
            {questions.map((q, idx) => (
              <button
                key={q._id}
                onClick={() => setCurrentIdx(idx)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  border: `1px solid ${currentIdx === idx ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: currentIdx === idx ? 'rgba(14,165,233,0.2)' : 
                              (typeof answers[q._id] === 'object' ? answers[q._id].code : answers[q._id]) ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.01)',
                  color: currentIdx === idx ? 'var(--primary)' : 
                         (typeof answers[q._id] === 'object' ? answers[q._id].code : answers[q._id]) ? 'var(--success)' : 'var(--text-dark)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.8rem'
                }}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* SECURED COLUMN 2: PROCTOR INTEGRITY MONITOR */}
        <div style={{
          borderLeft: '1px solid var(--border-color)',
          background: '#0a0d16',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          
          <div>
            {/* Webcam viewport HUD */}
            <div style={{ marginBottom: '32px' }}>
              <label className="label-cyber" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={14} style={{ color: 'var(--primary)' }} />
                Proctor AI Camera Feed
              </label>
              <div style={{
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid var(--border-neon)',
                boxShadow: '0 0 20px rgba(14,165,233,0.1)'
              }}>
                <canvas 
                  ref={canvasRef} 
                  width={240} 
                  height={180} 
                  style={{ width: '100%', display: 'block', aspectRatio: '4/3' }} 
                />
                
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  background: 'rgba(0,0,0,0.6)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  color: cameraStatus === 'present' ? 'var(--success)' : 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: `1px solid ${cameraStatus === 'present' ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`
                }}>
                  <span style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    background: cameraStatus === 'present' ? 'var(--success)' : 'var(--danger)', 
                    boxShadow: `0 0 6px ${cameraStatus === 'present' ? 'var(--success)' : 'var(--danger)'}`, 
                    animation: 'pulse 1.5s infinite' 
                  }} />
                  {cameraStatus === 'present' ? 'SECURED STREAM' : 'FEED INTERRUPTED'}
                </div>
              </div>
            </div>

            {/* Performance status card */}
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '32px', background: 'rgba(255,255,255,0.01)' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={16} style={{ color: 'var(--primary)' }} />
                Integrity Log
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Warnings Logged:</span>
                  <strong style={{ color: warningsCount >= 2 ? 'var(--danger)' : 'var(--text-main)' }}>
                    {warningsCount} / {exam ? exam.rules?.maxWarnings || 3 : 3}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Suspicion Index:</span>
                  <strong style={{ color: suspicionScore >= 50 ? 'var(--danger)' : 'var(--text-main)' }}>
                    {suspicionScore} pts
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>System Integrity:</span>
                  <strong style={{ color: suspicionScore >= 50 ? 'var(--danger)' : 'var(--success)' }}>
                    {100 - suspicionScore}% Trust
                  </strong>
                </div>
              </div>
            </div>

            {/* AI Diagnostics details */}
            <div className="glass-panel" style={{
              padding: '20px',
              borderColor: 'var(--primary)',
              background: 'rgba(14, 165, 233, 0.02)'
            }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, marginBottom: '10px' }}>
                ⚙️ Proctor AI Feed Telemetry
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                <div>• Hardware Acquisition: <strong style={{ color: cameraActive ? 'var(--success)' : 'var(--danger)' }}>{cameraActive ? 'NOMINAL' : 'FAILED'}</strong></div>
                <div>• Face Centroid Lock: <strong style={{ color: cameraStatus === 'present' ? 'var(--success)' : 'var(--danger)' }}>{cameraStatus === 'present' ? 'LOCKED' : 'SEARCHING...'}</strong></div>
                <div>• Covered Lens Check: <strong style={{ color: cameraStatus === 'blocked' ? 'var(--danger)' : 'var(--success)' }}>{cameraStatus === 'blocked' ? 'BLOCKED' : 'PASS'}</strong></div>
                <div>• Motion & Gaze Engine: <strong style={{ color: modelLoading ? 'var(--warning)' : 'var(--success)' }}>{modelLoading ? 'LOADING AI CORE...' : 'RUNNING (TFJS COCO-SSD)'}</strong></div>
              </div>
            </div>

            {/* Proctor AI Simulation Deck */}
            <div className="glass-panel" style={{
              padding: '20px',
              marginTop: '20px',
              borderColor: 'var(--warning)',
              background: 'rgba(234, 179, 8, 0.02)'
            }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--warning)', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🛡️ Proctor AI Simulation Deck
              </h4>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: '1.3' }}>
                Simulate proctoring violations to verify automated submission and high-fidelity reporting logs.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleSimulatePhone}
                  disabled={simulatedCheat !== null}
                  className="btn-cyber-danger"
                  style={{
                    padding: '8px',
                    fontSize: '0.7rem',
                    justifyContent: 'center',
                    background: 'rgba(244, 63, 94, 0.05)',
                    border: '1px solid var(--danger)',
                    cursor: simulatedCheat ? 'not-allowed' : 'pointer'
                  }}
                >
                  📱 Simulate Cell Phone Cheat
                </button>

                <button
                  type="button"
                  onClick={handleSimulateMultiPeople}
                  disabled={simulatedCheat !== null}
                  className="btn-cyber-danger"
                  style={{
                    padding: '8px',
                    fontSize: '0.7rem',
                    justifyContent: 'center',
                    background: 'rgba(244, 63, 94, 0.05)',
                    border: '1px solid var(--danger)',
                    cursor: simulatedCheat ? 'not-allowed' : 'pointer'
                  }}
                >
                  👥 Simulate Multi-People
                </button>
              </div>

              {simulationLog && (
                <div style={{
                  marginTop: '10px',
                  padding: '6px 8px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '0.6rem',
                  color: 'var(--warning)',
                  lineHeight: '1.2'
                }}>
                  {simulationLog}
                </div>
              )}
            </div>

          </div>

          {/* Secure lock metadata info */}
          <div style={{
            fontSize: '0.65rem',
            color: 'var(--text-dark)',
            textAlign: 'center',
            fontFamily: 'monospace',
            lineHeight: '1.4'
          }}>
            TRINETRA SECURE PORTAL ENGINE<br />
            BUILD VER. 5.1.0 // AES-256 ENCRYPTED
          </div>

        </div>

      </div>

    </div>
  );
};

export default ExamPortal;
