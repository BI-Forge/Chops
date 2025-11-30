import React, { useEffect, useState } from 'react';

interface DataNode {
  id: number;
  x: number;
  y: number;
  z: number;
  rotateX: number;
  rotateY: number;
  size: number;
  delay: number;
  duration: number;
}

export function Database3DAnimation() {
  const [nodes, setNodes] = useState<DataNode[]>([]);

  useEffect(() => {
    // Generate random data nodes
    const generatedNodes: DataNode[] = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      z: Math.random() * 100,
      rotateX: Math.random() * 360,
      rotateY: Math.random() * 360,
      size: 30 + Math.random() * 40,
      delay: Math.random() * 5,
      duration: 20 + Math.random() * 15,
    }));
    setNodes(generatedNodes);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      <div className="absolute inset-0" style={{ perspective: '1000px' }}>
        {/* Floating data cubes */}
        {nodes.map((node) => (
          <div
            key={node.id}
            className="absolute"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              transform: `translateZ(${node.z}px)`,
              animation: `float3d ${node.duration}s ease-in-out infinite`,
              animationDelay: `${node.delay}s`,
            }}
          >
            {/* 3D Cube representing data block */}
            <div
              className="relative"
              style={{
                width: `${node.size}px`,
                height: `${node.size}px`,
                transformStyle: 'preserve-3d',
                animation: `rotate3d ${node.duration * 1.5}s linear infinite`,
                animationDelay: `${node.delay}s`,
              }}
            >
              {/* Front face */}
              <div
                className="absolute w-full h-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-yellow-400/30 backdrop-blur-sm"
                style={{
                  transform: `rotateY(0deg) translateZ(${node.size / 2}px)`,
                }}
              >
                <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-1 p-2">
                  <div className="bg-yellow-400/20 rounded-sm" />
                  <div className="bg-amber-500/20 rounded-sm" />
                  <div className="bg-orange-500/20 rounded-sm" />
                  <div className="bg-yellow-400/20 rounded-sm" />
                </div>
              </div>
              
              {/* Back face */}
              <div
                className="absolute w-full h-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-400/30 backdrop-blur-sm"
                style={{
                  transform: `rotateY(180deg) translateZ(${node.size / 2}px)`,
                }}
              />
              
              {/* Right face */}
              <div
                className="absolute w-full h-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-yellow-400/30 backdrop-blur-sm"
                style={{
                  transform: `rotateY(90deg) translateZ(${node.size / 2}px)`,
                }}
              />
              
              {/* Left face */}
              <div
                className="absolute w-full h-full bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-400/30 backdrop-blur-sm"
                style={{
                  transform: `rotateY(-90deg) translateZ(${node.size / 2}px)`,
                }}
              />
              
              {/* Top face */}
              <div
                className="absolute w-full h-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-yellow-400/30 backdrop-blur-sm"
                style={{
                  transform: `rotateX(90deg) translateZ(${node.size / 2}px)`,
                }}
              />
              
              {/* Bottom face */}
              <div
                className="absolute w-full h-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-yellow-400/30 backdrop-blur-sm"
                style={{
                  transform: `rotateX(-90deg) translateZ(${node.size / 2}px)`,
                }}
              />
            </div>
          </div>
        ))}

        {/* Connection lines between nodes */}
        <svg className="absolute inset-0 w-full h-full">
          {nodes.map((node, i) => {
            if (i < nodes.length - 1) {
              const nextNode = nodes[i + 1];
              return (
                <line
                  key={`line-${node.id}`}
                  x1={`${node.x}%`}
                  y1={`${node.y}%`}
                  x2={`${nextNode.x}%`}
                  y2={`${nextNode.y}%`}
                  stroke="rgba(251, 191, 36, 0.15)"
                  strokeWidth="1"
                  className="animate-pulse"
                  style={{
                    animationDuration: `${3 + Math.random() * 2}s`,
                    animationDelay: `${node.delay}s`,
                  }}
                />
              );
            }
            return null;
          })}
          
          {/* Create some random connections */}
          {nodes.map((node, i) => {
            const randomConnect = nodes[(i + 3) % nodes.length];
            if (Math.random() > 0.5) {
              return (
                <line
                  key={`random-line-${node.id}`}
                  x1={`${node.x}%`}
                  y1={`${node.y}%`}
                  x2={`${randomConnect.x}%`}
                  y2={`${randomConnect.y}%`}
                  stroke="rgba(251, 191, 36, 0.1)"
                  strokeWidth="0.5"
                  strokeDasharray="5,5"
                  className="animate-pulse"
                  style={{
                    animationDuration: `${4 + Math.random() * 3}s`,
                    animationDelay: `${node.delay}s`,
                  }}
                />
              );
            }
            return null;
          })}
        </svg>

        {/* Data flow particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-yellow-400 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `dataFlow ${5 + Math.random() * 10}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`,
              boxShadow: '0 0 4px rgba(251, 191, 36, 0.8)',
            }}
          />
        ))}

        {/* Binary rain effect */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={`binary-${i}`}
            className="absolute text-xs text-yellow-400/20 font-mono"
            style={{
              left: `${i * 10}%`,
              top: '-20px',
              animation: `binaryRain ${10 + Math.random() * 10}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          >
            {Array.from({ length: 15 }).map((_, j) => (
              <div key={j} className="leading-tight">
                {Math.random() > 0.5 ? '1' : '0'}
              </div>
            ))}
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes float3d {
          0%, 100% {
            transform: translateY(0) translateX(0) translateZ(0);
          }
          25% {
            transform: translateY(-30px) translateX(20px) translateZ(20px);
          }
          50% {
            transform: translateY(-60px) translateX(-20px) translateZ(40px);
          }
          75% {
            transform: translateY(-30px) translateX(-40px) translateZ(20px);
          }
        }

        @keyframes rotate3d {
          0% {
            transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg);
          }
          33% {
            transform: rotateX(120deg) rotateY(120deg) rotateZ(0deg);
          }
          66% {
            transform: rotateX(240deg) rotateY(240deg) rotateZ(120deg);
          }
          100% {
            transform: rotateX(360deg) rotateY(360deg) rotateZ(360deg);
          }
        }

        @keyframes dataFlow {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) translateX(50px) scale(0.5);
            opacity: 0;
          }
        }

        @keyframes binaryRain {
          0% {
            transform: translateY(0);
            opacity: 0;
          }
          10% {
            opacity: 0.3;
          }
          90% {
            opacity: 0.3;
          }
          100% {
            transform: translateY(100vh);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
