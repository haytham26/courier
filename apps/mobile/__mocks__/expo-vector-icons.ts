import React from 'react';

const View = ({ children, ...props }: any) => React.createElement('div', props, children);

export const Ionicons = ({ name, size, color }: any) => (
  React.createElement(View, { 'data-testid': `icon-${name}`, style: { width: size, height: size } })
);