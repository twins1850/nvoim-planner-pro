// 오프라인 모드에서 사용할 샘플 숙제 데이터

export const sampleHomeworkData = [
  {
    id: 'sample-hw-1',
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
    id: 'sample-hw-2',
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
    id: 'sample-hw-3',
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
  },
  {
    id: 'sample-hw-4',
    title: '영어 회화 연습 - 여행 계획',
    description: '여행 계획에 대해 이야기하는 상황을 연습해보세요. 다음 질문에 대한 답변을 녹음해주세요.',
    type: 'audio',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    content: {
      questions: [
        {
          id: 'q1',
          type: 'audio',
          text: '다음 질문에 대한 답변을 녹음해주세요: "Where would you like to travel next and why?"'
        },
        {
          id: 'q2',
          type: 'audio',
          text: '다음 질문에 대한 답변을 녹음해주세요: "What activities would you like to do during your trip?"'
        },
        {
          id: 'q3',
          type: 'audio',
          text: '다음 질문에 대한 답변을 녹음해주세요: "How long would you like to stay there?"'
        }
      ]
    }
  },
  {
    id: 'sample-hw-5',
    title: '영어 작문 - 나의 꿈',
    description: '자신의 꿈이나 미래 계획에 대해 영어로 작문해보세요.',
    type: 'text',
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    content: {
      questions: [
        {
          id: 'q1',
          type: 'text',
          text: '자신의 꿈이나 미래 계획에 대해 영어로 작성해보세요. (최소 200단어)'
        }
      ]
    }
  }
];