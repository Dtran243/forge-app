/**
 * (tabs)/_layout.tsx
 *
 * Five-tab bottom navigator.
 * Today, Program, Progress, Chat, Profile.
 * Non-Today tabs are placeholder screens until their respective stages are built.
 */

import { Tabs } from 'expo-router';
import { Text } from 'react-native';

const TAB_ICON_SIZE = 18;

function Icon({ symbol, color }: { symbol: string; color: string }) {
  return <Text style={{ color, fontSize: TAB_ICON_SIZE }}>{symbol}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#09090b', // zinc-950
          borderTopColor: '#27272a',  // zinc-800
        },
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#71717a', // zinc-500
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <Icon symbol="◈" color={color} />,
        }}
      />
      <Tabs.Screen
        name="program"
        options={{
          title: 'Program',
          tabBarIcon: ({ color }) => <Icon symbol="⊟" color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => <Icon symbol="↗" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <Icon symbol="⌘" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Icon symbol="◯" color={color} />,
        }}
      />
    </Tabs>
  );
}
