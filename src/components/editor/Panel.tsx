import { type ReactNode, type CSSProperties } from 'react';

// Panel formal pada lembar peta cetak (tidak diubah)
export const Panel = ({ title, children, bodyStyle, style }: { title: string; children: ReactNode; bodyStyle?: CSSProperties; style?: CSSProperties }) => (
  <div style={{ border: '1.5px solid #000', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', minWidth: 0, ...style }}>
    <div style={{ fontSize: '9px', fontWeight: 'bold', letterSpacing: '1px', textAlign: 'center', textTransform: 'uppercase', borderBottom: '1px solid #ccc', margin: '6px 6px 0', paddingBottom: '2px' }}>
      {title}
    </div>
    <div style={{ padding: '5px 6px 6px', flex: 1, minHeight: 0, ...bodyStyle }}>{children}</div>
  </div>
);
