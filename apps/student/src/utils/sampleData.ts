// 오프라인 모드에서 사용할 샘플 데이터

// 샘플 피드백 데이터
export const sampleFeedbacks = [
  {
    id: 'sample-feedback-1',
    title: '회화 수업 피드백 - 자기소개',
    type: 'lesson',
    createdAt: new Date().toISOString(),
    content: '오늘 수업에서는 자기소개에 관한 표현을 배웠습니다. 전반적으로 잘 따라왔으며, 특히 취미에 관한 표현을 잘 사용했습니다. 발음은 계속 연습이 필요합니다.',
    scores: {
      pronunciation: 75,
      fluency: 80,
      accuracy: 85,
      overall: 80
    },
    strengths: [
      '취미에 관한 표현을 자연스럽게 사용함',
      '질문에 적절하게 대답함',
      '새로운 단어를 잘 활용함'
    ],
    improvements: [
      'th 발음 연습이 필요함',
      '과거 시제 사용에 주의가 필요함',
      '문장을 더 길게 구성해보기'
    ],
    nextSteps: '다음 수업에서는 일상 생활에 관한 대화를 연습할 예정입니다. "What did you do yesterday?"와 같은 과거 시제 질문에 대답하는 연습을 해오세요.'
  },
  {
    id: 'sample-feedback-2',
    title: '숙제 피드백 - 일상 활동 설명하기',
    type: 'homework',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    content: '일상 활동을 설명하는 숙제를 잘 완성했습니다. 다양한 동사를 사용하여 하루 일과를 설명했고, 시간 표현도 적절히 사용했습니다. 단, 전치사 사용에 몇 가지 오류가 있었습니다.',
    scores: {
      pronunciation: 85,
      fluency: 75,
      accuracy: 70,
      overall: 75
    },
    strengths: [
      '다양한 어휘 사용',
      '시간 표현을 정확하게 사용함',
      '자연스러운 문장 연결'
    ],
    improvements: [
      '전치사 in/on/at 사용 구분하기',
      '현재 진행형 시제 연습하기',
      '문장 끝에서 목소리가 작아지는 경향이 있음'
    ],
    nextSteps: '전치사 사용법에 관한 추가 연습이 필요합니다. 다음 숙제에서는 장소와 관련된 표현을 더 연습해보세요.'
  },
  {
    id: 'sample-feedback-3',
    title: '회화 수업 피드백 - 음식 주문하기',
    type: 'lesson',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    content: '레스토랑에서 음식 주문하는 상황을 연습했습니다. 메뉴 이름과 기본적인 주문 표현을 잘 사용했습니다. 특별 요청 사항을 표현하는 부분에서 어려움이 있었지만, 전반적으로 좋은 수업이었습니다.',
    scores: {
      pronunciation: 80,
      fluency: 70,
      accuracy: 75,
      overall: 75
    },
    strengths: [
      '메뉴 관련 어휘를 잘 기억함',
      '기본 주문 표현을 자연스럽게 사용함',
      '숫자와 가격 표현을 정확하게 말함'
    ],
    improvements: [
      '특별 요청 시 would like, could you 표현 연습하기',
      '음식 설명 관련 형용사 더 배우기',
      '대화 중 자신감 있게 말하기'
    ],
    nextSteps: '다음 수업에서는 호텔 체크인 상황을 연습할 예정입니다. 관련 표현을 미리 학습해오세요.'
  }
];

// 샘플 숙제 데이터
export const sampleHomeworks = [
  {
    id: 'sample-homework-1',
    title: '자기소개 녹음하기',
    description: '1분 내외로 자신을 소개하는 음성을 녹음해주세요. 이름, 나이, 취미, 좋아하는 것에 대해 말해보세요.',
    type: 'audio',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    content: {
      questions: [
        {
          id: 'q1',
          type: 'audio',
          text: '자신을 소개하는 음성을 녹음해주세요. (이름, 나이, 취미, 좋아하는 것)'
        }
      ]
    }
  },
  {
    id: 'sample-homework-2',
    title: '일상 활동 설명하기',
    description: '하루 일과를 영어로 설명해보세요. 아침에 일어나서부터 잠자리에 들 때까지의 활동을 시간과 함께 설명해주세요.',
    type: 'text',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    content: {
      questions: [
        {
          id: 'q1',
          type: 'text',
          text: '하루 일과를 영어로 설명해보세요. (최소 10문장)'
        }
      ]
    }
  },
  {
    id: 'sample-homework-3',
    title: '대화 연습 - 레스토랑에서',
    description: '레스토랑에서 음식을 주문하는 상황을 연습해보세요. 주어진 대화문을 읽고 녹음해주세요.',
    type: 'audio',
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'overdue',
    content: {
      questions: [
        {
          id: 'q1',
          type: 'audio',
          text: '다음 대화문을 읽고 녹음해주세요:\n\nWaiter: Hello, welcome to our restaurant. What would you like to order?\nYou: I would like to order a steak, please.\nWaiter: How would you like your steak cooked?\nYou: Medium rare, please.\nWaiter: Would you like any side dishes?\nYou: Yes, I would like some mashed potatoes and a salad.'
        }
      ]
    }
  }
];

// 샘플 알림 데이터
export const sampleNotifications = [
  {
    id: 'sample-notification-1',
    title: '새로운 숙제가 등록되었습니다',
    body: '자기소개 녹음하기 숙제가 등록되었습니다. 마감일: 3일 후',
    type: 'homework',
    referenceId: 'sample-homework-1',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: false
  },
  {
    id: 'sample-notification-2',
    title: '피드백이 등록되었습니다',
    body: '회화 수업 피드백 - 자기소개에 대한 피드백이 등록되었습니다.',
    type: 'feedback',
    referenceId: 'sample-feedback-1',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: true
  },
  {
    id: 'sample-notification-3',
    title: '숙제 마감일 알림',
    body: '대화 연습 - 레스토랑에서 숙제의 마감일이 내일입니다.',
    type: 'homework',
    referenceId: 'sample-homework-3',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: true
  }
];

// 샘플 사용자 프로필
export const sampleUserProfile = {
  _id: 'sample-user-id',
  name: '김영어',
  email: 'student@example.com',
  role: 'student',
  profile: {
    name: '김영어',
    phone: '010-1234-5678',
    learningLevel: '중급',
    preferences: {
      language: 'ko',
      notifications: true,
      timezone: 'Asia/Seoul'
    }
  }
};