import { Handle, Position } from 'reactflow';

interface StyledHandleProps {
  type: 'source' | 'target';
  position: Position;
  isConnectable: boolean;
  id?: string;
  style?: React.CSSProperties;
}

export const StyledHandle = ({
  type,
  position,
  style,
  isConnectable,
  id
}: StyledHandleProps) => {
  const baseStyle = {
    width: '10px',
    height: '10px',
    background: '#2d2b2f7d',
    border: '2px solid #8f9093',
  };

  const mergedStyle = { ...baseStyle, ...style };

  return (
    <Handle
      type={type}
      position={position}
      style={mergedStyle}
      isConnectable={isConnectable}
      id={id}
    />
  );
};

export const standardHandleStyle = {
  width: '10px',
  height: '10px',
  background: '#2d2b2f7d',
  border: '2px solid #8f9093',
};

export const yesHandleStyle = {
  width: '10px',
  height: '10px',
  background: '#10b981',
  border: '2px solid #8f9093',
  left: '30%',
};

export const noHandleStyle = {
  width: '10px',
  height: '10px',
  background: '#ef4444',
  border: '2px solid #8f9093',
  left: '70%',
};