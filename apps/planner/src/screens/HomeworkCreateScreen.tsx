import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';

type HomeworkCreateScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'HomeworkCreate'
>;

interface HomeworkCreateScreenProps {
  navigation: HomeworkCreateScreenNavigationProp;
}

const HomeworkCreateScreen = ({ navigation }: HomeworkCreateScreenProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>숙제 생성</Text>
      <Text style={styles.description}>
        이 화면에서는 새로운 숙제를 생성할 수 있습니다. 제목, 설명, 마감일, 학생 선택 등의 기능이 구현될 예정입니다.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default HomeworkCreateScreen;