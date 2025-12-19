import React, { useState, useEffect, useRef } from 'react';
import { Camera, Wifi, WifiOff, Bell, Image } from 'lucide-react';

const PhotoBlogClient = () => {
  const [notifications, setNotifications] = useState([]);
  const [objectCounts, setObjectCounts] = useState({});
  const [edgeStatus, setEdgeStatus] = useState('disconnected');
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const wsRef = useRef(null);

  // WebSocket 연결
  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket('ws://127.0.0.1:8000/ws/notifications/');
      
      ws.onopen = () => {
        console.log('WebSocket 연결됨');
        setEdgeStatus('connected');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('수신:', data);

        if (data.type === 'detection_alert') {
          // 실시간 알림
          const newNotification = {
            id: Date.now(),
            object_name: data.object_name,
            confidence: data.confidence,
            timestamp: data.timestamp,
            image_id: data.image_id,
            image_url: data.image_url
          };
          setNotifications(prev => [newNotification, ...prev].slice(0, 20));
          
          // 이미지 목록 새로고침
          fetchImages();
        } else if (data.type === 'object_count') {
          // 객체 카운터 업데이트
          setObjectCounts(data.counts);
        } else if (data.type === 'edge_status') {
          setEdgeStatus(data.status);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket 연결 끊김');
        setEdgeStatus('disconnected');
        // 3초 후 재연결
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket 오류:', error);
      };

      wsRef.current = ws;
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // 이미지 목록 가져오기
  const fetchImages = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api_root/Post/');
      const data = await response.json();
      setImages(data.reverse()); // 최신순 정렬
    } catch (error) {
      console.error('이미지 로드 실패:', error);
    }
  };

  useEffect(() => {
    fetchImages();
    // 30초마다 새로고침
    const interval = setInterval(fetchImages, 30000);
    return () => clearInterval(interval);
  }, []);

  // 알림 클릭 시 이미지 상세보기
  const handleNotificationClick = (imageId) => {
    const image = images.find(img => img.id === imageId);
    if (image) {
      setSelectedImage(image);
    }
  };

  // 객체 카운터 표시
  const ObjectCounter = ({ name, count, icon, color }) => {
    const percentage = Math.min((count / 10) * 100, 100);
    
    return (
      <div className="bg-white rounded-lg p-4 shadow">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <span className="font-semibold">{name}</span>
          </div>
          <span className="text-2xl font-bold" style={{ color }}>{count}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="h-3 rounded-full transition-all duration-300"
            style={{ 
              width: `${percentage}%`,
              backgroundColor: color
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Camera className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold">실시간 침입자 감시 시스템</h1>
            </div>
            
            {/* Edge 연결 상태 */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              edgeStatus === 'connected' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {edgeStatus === 'connected' ? (
                <>
                  <Wifi className="w-5 h-5" />
                  <span className="font-semibold">카메라 연결됨</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5" />
                  <span className="font-semibold">카메라 연결 끊김</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 실시간 알림 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-6 h-6 text-orange-600" />
                <h2 className="text-xl font-bold">실시간 알림</h2>
                <span className="ml-auto bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-sm font-semibold">
                  {notifications.length}
                </span>
              </div>
              
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">알림이 없습니다</p>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif.image_id)}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-blue-50 cursor-pointer transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                          {notif.image_url && (
                            <img 
                              src={`http://127.0.0.1:8000${notif.image_url}`}
                              alt="감지된 이미지"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">
                            {notif.object_name} 감지
                          </p>
                          <p className="text-sm text-gray-600">
                            신뢰도: {(notif.confidence * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(notif.timestamp).toLocaleString('ko-KR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 오른쪽: 객체 카운터 + 이미지 갤러리 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 라이브 객체 카운터 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">실시간 객체 카운터</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ObjectCounter 
                  name="사람" 
                  count={objectCounts.person || 0}
                  icon="👤"
                  color="#3b82f6"
                />
                <ObjectCounter 
                  name="자동차" 
                  count={objectCounts.car || 0}
                  icon="🚗"
                  color="#ef4444"
                />
                <ObjectCounter 
                  name="강아지" 
                  count={objectCounts.dog || 0}
                  icon="🐕"
                  color="#f59e0b"
                />
              </div>
            </div>

            {/* 이미지 갤러리 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Image className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold">감지된 이미지</h2>
                <span className="ml-auto bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm font-semibold">
                  {images.length}개
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto">
                {images.length === 0 ? (
                  <p className="col-span-full text-gray-500 text-center py-8">
                    이미지가 없습니다
                  </p>
                ) : (
                  images.map(image => (
                    <div 
                      key={image.id}
                      onClick={() => setSelectedImage(image)}
                      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg cursor-pointer transition"
                    >
                      <img 
                        src={`http://127.0.0.1:8000${image.image}`}
                        alt={image.title}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-2">
                        <p className="font-semibold text-sm truncate">
                          {image.title || '제목 없음'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(image.created_date).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 이미지 상세보기 모달 */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold">{selectedImage.title || '제목 없음'}</h3>
                  <p className="text-gray-500">
                    {new Date(selectedImage.created_date).toLocaleString('ko-KR')}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="text-gray-500 hover:text-gray-700 text-3xl"
                >
                  ×
                </button>
              </div>
              
              <img 
                src={`http://127.0.0.1:8000${selectedImage.image}`}
                alt={selectedImage.title}
                className="w-full rounded-lg mb-4"
              />
              
              {selectedImage.text && (
                <p className="text-gray-700">{selectedImage.text}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoBlogClient;