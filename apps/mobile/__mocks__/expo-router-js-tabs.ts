import React from 'react';

export const Tabs = ({ children, screenOptions }: any) => {
  return (
    <React.Fragment>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type && (child.type as any).displayName === 'Screen') {
          return React.cloneElement(child, { screenOptions });
        }
        return child;
      })}
    </React.Fragment>
  );
};

export const Screen = ({ name, options }: any) => (
  <View data-testid={`tab-${name}`}><Text>{options?.title || name}</Text></View>
);

(Screen as any).displayName = 'Screen';

// Mock View and Text for this file
const View = ({ children, ...props }: any) => <div {...props}>{children}</div>;
const Text = ({ children, ...props }: any) => <span {...props}>{children}</span>;