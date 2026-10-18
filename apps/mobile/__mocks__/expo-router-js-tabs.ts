import React from 'react';

export const Tabs = ({ children, screenOptions }: any) => {
  return React.createElement(
    React.Fragment,
    null,
    React.Children.map(children, (child) => {
      if (React.isValidElement(child) && child.type && (child.type as any).displayName === 'Screen') {
        return React.cloneElement(child, { screenOptions } as any);
      }
      return child;
    })
  );
};

export const Screen = ({ name, options }: any) =>
  React.createElement('div', { 'data-testid': `tab-${name}` },
    React.createElement('span', null, options?.title || name)
  );

(Screen as any).displayName = 'Screen';