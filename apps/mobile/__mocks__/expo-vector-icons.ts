import React from 'react';

export const Ionicons = ({ name, size, color }: any) => (
  <View data-testid={`icon-${name}`} style={{ width: size, height: size }} />
);

const View = ({ children, ...props }: any) => <div {...props}>{children}</div>;