import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';

export const Room = () => {
  const [peers, setPeers] = useState([]);
  const socketRef = useRef();
  const userVideoRef = useRef();
  const peersRef = useRef([]);
  const [roomId, setRoomId] = useState(''); // State to hold the room ID

  useEffect(() => {
    // Connect to signaling server
    socketRef.current = io.connect('/');

    // Get the user's video stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        userVideoRef.current.srcObject = stream;

        // Join the room when the component mounts
        if (roomId) {
          socketRef.current.emit('join room', roomId);
        }

        // Receive signal from new user and create a new peer connection
        socketRef.current.on('user joined', (userId) => {
          const peer = createPeer(userId, socketRef.current.id, stream);
          peersRef.current.push({
            userId,
            peer,
          });
          setPeers([...peersRef.current]);
        });

        // Signal other users in the room when joining
        socketRef.current.on('user joined signal', ({ userId, signal }) => {
          const item = peersRef.current.find((p) => p.userId === userId);
          if (item) {
            item.peer.signal(signal);
          }
        });

        // Remove disconnected users
        socketRef.current.on('user left', (userId) => {
          const item = peersRef.current.find((p) => p.userId === userId);
          if (item) {
            item.peer.destroy();
            peersRef.current = peersRef.current.filter((p) => p.userId !== userId);
            setPeers([...peersRef.current]);
          }
        });
      })
      .catch((error) => console.error(error));

    // Clean up on component unmount
    return () => {
      socketRef.current.disconnect();
    };
  }, [roomId]); // Run effect when the roomId changes

  // Create a new peer connection
  const createPeer = (userId, callerId, stream) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on('signal', (signal) => {
      socketRef.current.emit('signal to user', {
        userId,
        callerId,
        signal,
      });
    });

    return peer;
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomId.trim()) {
      socketRef.current.emit('join room', roomId);
    }
  };

  return (
    <div>
      <form onSubmit={handleJoinRoom}>
        <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Enter room ID"
        />
        <button type="submit">Join Room</button>
      </form>
      <video ref={userVideoRef} autoPlay muted />
      {/* Render video elements for each connected peer */}
      {peers.map((peer) => (
        <video key={peer.userId} ref={peer.ref} autoPlay />
      ))}
    </div>
  );
};

export default Room;