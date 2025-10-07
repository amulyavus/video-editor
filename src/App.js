import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Pause, SkipBack, SkipForward, Scissors, Download, Wand2, Volume2, VolumeX, Maximize, ZoomIn, ZoomOut, Film, Sparkles, Layers } from 'lucide-react';
import './App.css';

export default function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [activeAITool, setActiveAITool] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => {
      setDuration(video.duration);
      setTrimEnd(video.duration);
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [videoFile]);

  const handleFileSelect = (file) => {
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setVideoFile(url);
      setIsPlaying(false);
      setCurrentTime(0);
      setTrimStart(0);
      setTrimEnd(0);
      setActiveAITool(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSkipBack = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, currentTime - 5);
    }
  };

  const handleSkipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(duration, currentTime + 5);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimelineClick = (e) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      videoRef.current.currentTime = percentage * duration;
    }
  };

  const handleTrimVideo = async () => {
    if (!videoRef.current) return;
    
    setProcessing(true);
    setActiveAITool('trim');

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const stream = canvas.captureStream(30);
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(video);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      source.connect(audioContext.destination);

      const audioTrack = destination.stream.getAudioTracks()[0];
      if (audioTrack) {
        stream.addTrack(audioTrack);
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000
      });

      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trimmed-video-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setProcessing(false);
      };

      video.currentTime = trimStart;
      await new Promise(resolve => {
        video.onseeked = resolve;
      });

      mediaRecorder.start();
      video.play();

      const drawFrame = () => {
        if (video.currentTime >= trimEnd) {
          video.pause();
          mediaRecorder.stop();
          audioContext.close();
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(drawFrame);
      };

      drawFrame();

    } catch (error) {
      console.error('Trim error:', error);
      alert('Trimming failed. Your browser may not support this feature.');
      setProcessing(false);
    }
  };

  const handleCancelTrim = () => {
    setTrimStart(0);
    setTrimEnd(duration);
    setActiveAITool(null);
    setProcessing(false);
  };

  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app-container">
      <div className="header">
        <div className="logo">
          <div className="logo-icon">
            <Film size={28} color="white" />
          </div>
          <h1>Vedit</h1>
        </div>
        <p className="tagline">AI-Powered Video Editor </p>
      </div>

      <div className="main-content">
        <div className="video-section">
          {!videoFile ? (
            <div
              className={`upload-area ${dragOver ? 'drag-over' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="upload-icon">
                <Upload size={40} />
              </div>
              <div className="upload-text">
                <h3>Upload Your Video</h3>
                <p>Drag and drop or click to browse</p>
                <p style={{ fontSize: '0.85rem', marginTop: '8px', opacity: 0.7 }}>
                  Supports MP4, WebM, MOV
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                style={{ display: 'none' }}
                onChange={(e) => handleFileSelect(e.target.files[0])}
              />
            </div>
          ) : (
            <>
              <div className="video-player">
                <video
                  ref={videoRef}
                  className="video-element"
                  src={videoFile}
                  onClick={togglePlay}
                  crossOrigin="anonymous"
                />
                <div className="video-overlay">
                  <div className="play-button" onClick={togglePlay}>
                    {isPlaying ? <Pause size={32} color="#333" /> : <Play size={32} color="#333" />}
                  </div>
                </div>
              </div>

              <div className="controls-panel">
                <div className="controls-row">
                  <button className="control-btn" onClick={handleSkipBack}>
                    <SkipBack size={18} />
                    -5s
                  </button>
                  <button className="control-btn" onClick={togglePlay}>
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                  <button className="control-btn" onClick={handleSkipForward}>
                    +5s
                    <SkipForward size={18} />
                  </button>
                  <button className="control-btn secondary" onClick={toggleMute}>
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  <button className="control-btn secondary">
                    <Maximize size={18} />
                  </button>
                </div>
              </div>

              <div className="timeline-section">
                <div className="timeline-header">
                  <h3>
                    <Layers size={20} />
                    Timeline
                  </h3>
                  <div className="timeline-controls">
                    <button className="timeline-btn">
                      <ZoomIn size={16} />
                    </button>
                    <button className="timeline-btn">
                      <ZoomOut size={16} />
                    </button>
                  </div>
                </div>
                <div className="timeline-track" onClick={handleTimelineClick}>
                  <div
                    className="timeline-progress"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                  {activeAITool === 'trim' && (
                    <div
                      className="trim-markers"
                      style={{
                        left: `${(trimStart / duration) * 100}%`,
                        width: `${((trimEnd - trimStart) / duration) * 100}%`
                      }}
                    />
                  )}
                  <div
                    className="timeline-marker"
                    style={{ left: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
                <div className="timeline-info">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>

                {activeAITool === 'trim' && (
                  <div className="trim-controls">
                    <div className="trim-input-group">
                      <label>Start Time (seconds)</label>
                      <input
                        type="number"
                        min="0"
                        max={duration}
                        step="0.1"
                        value={trimStart.toFixed(1)}
                        onChange={(e) => setTrimStart(Math.max(0, Math.min(parseFloat(e.target.value) || 0, trimEnd - 0.1)))}
                      />
                    </div>
                    <div className="trim-input-group">
                      <label>End Time (seconds)</label>
                      <input
                        type="number"
                        min="0"
                        max={duration}
                        step="0.1"
                        value={trimEnd.toFixed(1)}
                        onChange={(e) => setTrimEnd(Math.max(trimStart + 0.1, Math.min(parseFloat(e.target.value) || duration, duration)))}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button 
                        className="control-btn" 
                        onClick={handleTrimVideo}
                        disabled={processing}
                      >
                        <Download size={18} />
                        {processing ? 'Trimming...' : 'Trim & Download'}
                        
                      </button>
                      <button 
                        className="control-btn secondary"
                        onClick={handleCancelTrim}
                        disabled={processing}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="ai-tools-panel">
          <div className="ai-tools-header">
            <Sparkles size={28} color="#667eea" />
            <h2>AI Tools</h2>
          </div>

          <div
            className={`ai-tool-card ${activeAITool === 'enhance' ? 'active' : ''}`}
            onClick={() => setActiveAITool(activeAITool === 'enhance' ? null : 'enhance')}
          >
            <div className="ai-tool-header">
              <div className="ai-tool-icon">
                <Wand2 size={20} />
              </div>
              <h3>Auto Enhance</h3>
            </div>
            <p>Automatically improve video quality, adjust colors, and optimize lighting with AI.</p>
            {activeAITool === 'enhance' && (
              <div className="status-badge ready">
                Click to apply enhancement
              </div>
            )}
          </div>

          <div
            className={`ai-tool-card ${activeAITool === 'trim' ? 'active' : ''}`}
            onClick={() => setActiveAITool(activeAITool === 'trim' ? null : 'trim')}
          >
            <div className="ai-tool-header">
              <div className="ai-tool-icon">
                <Scissors size={20} />
              </div>
              <h3>Smart Trim</h3>
            </div>
            <p>Select start and end times to trim your video. The trimmed section will be downloaded.</p>
            {activeAITool === 'trim' && (
              <div className={`status-badge ${processing ? 'processing' : 'ready'}`}>
                {processing ? 'Processing...' : 'Set times in timeline below'}
              </div>
            )}
          </div>

          <div
            className={`ai-tool-card ${activeAITool === 'captions' ? 'active' : ''}`}
            onClick={() => setActiveAITool(activeAITool === 'captions' ? null : 'captions')}
          >
            <div className="ai-tool-header">
              <div className="ai-tool-icon">
                <Film size={20} />
              </div>
              <h3>Auto Captions</h3>
            </div>
            <p>Generate accurate subtitles and captions using speech recognition AI.</p>
            {activeAITool === 'captions' && (
              <div className="status-badge ready">
                Click to generate captions
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}