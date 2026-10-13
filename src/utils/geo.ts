export const expandBbox = (b: number[], f: number): [number, number, number, number] => {
  const dx = (b[2] - b[0]) * f;
  const dy = (b[3] - b[1]) * f;
  return [b[0] - dx, b[1] - dy, b[2] + dx, b[3] + dy];
};

// Konversi Derajat Desimal ke Format DMS
export const toDMS = (val: number, isLat: boolean) => {
  if (isNaN(val)) return '-';
  const abs = Math.abs(val);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = Math.round(((abs - d) * 60 - m) * 60);
  const dir = isLat ? (val >= 0 ? 'LU' : 'LS') : (val >= 0 ? 'BT' : 'BB');
  return `${d}° ${m.toString().padStart(2, '0')}' ${s.toString().padStart(2, '0')}" ${dir}`;
};

export const getFeatureName = (props: any) => {
  if (!props) return '';
  return (
    props.WADMKD || props.wadmkd ||
    props.NAMOBJ || props.namobj ||
    props.DESA || props.desa || ''
  );
};
