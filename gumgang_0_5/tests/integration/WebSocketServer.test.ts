/**
 * 금강 2.0 - WebSocket 서버 통합 테스트
 * 실시간 협업 기능 테스트 스위트
 */

import { WebSocketServer } from '../../backend/app/api/websocket_server';
import { WebSocketCollaborationService } from '../../gumgang-v2/src/services/WebSocketCollaborationService';
import { Server as HttpServer } from 'http';
import { Socket as ClientSocket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { wait, flushPromises } from '../setupTests';

// 테스트용 서버 설정
const TEST_PORT = 8002;
const TEST_URL = `http://localhost:${TEST_PORT}`;

// 모킹된 사용자 데이터
const mockUsers = {
  user1: {
    id: 'user-001',
    name: '김개발',
    email: 'dev@gumgang.com',
    avatar: 'avatar1.png',
  },
  user2: {
    id: 'user-002',
    name: '이디자인',
    email: 'design@gumgang.com',
    avatar: 'avatar2.png',
  },
  user3: {
    id: 'user-003',
    name: '박기획',
    email: 'pm@gumgang.com',
    avatar: 'avatar3.png',
  },
};

describe('WebSocket 서버 통합 테스트', () => {
  let httpServer: HttpServer;
  let wsServer: WebSocketServer;
  let client1: ClientSocket;
  let client2: ClientSocket;
  let client3: ClientSocket;

  beforeAll((done) => {
    // HTTP 서버 생성
    httpServer = require('http').createServer();

    // WebSocket 서버 초기화
    wsServer = new WebSocketServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      pingTimeout: 5000,
      pingInterval: 3000,
    });

    // 서버 시작
    httpServer.listen(TEST_PORT, () => {
      console.log(`🧪 테스트 WebSocket 서버 시작: ${TEST_URL}`);
      done();
    });
  });

  afterAll((done) => {
    // 모든 클라이언트 연결 종료
    if (client1) client1.disconnect();
    if (client2) client2.disconnect();
    if (client3) client3.disconnect();

    // 서버 종료
    wsServer.close(() => {
      httpServer.close(() => {
        console.log('🛑 테스트 WebSocket 서버 종료');
        done();
      });
    });
  });

  beforeEach(() => {
    // 각 테스트 전 클라이언트 초기화
    jest.clearAllMocks();
  });

  afterEach(() => {
    // 각 테스트 후 클라이언트 정리
    if (client1 && client1.connected) client1.disconnect();
    if (client2 && client2.connected) client2.disconnect();
    if (client3 && client3.connected) client3.disconnect();
  });

  describe('연결 관리', () => {
    test('클라이언트 연결 수립', (done) => {
      client1 = io(TEST_URL, {
        auth: { user: mockUsers.user1 },
      });

      client1.on('connect', () => {
        expect(client1.connected).toBe(true);
        expect(client1.id).toBeDefined();
        done();
      });
    });

    test('인증 없이 연결 시도', (done) => {
      const unauthorizedClient = io(TEST_URL, {
        auth: {},
      });

      unauthorizedClient.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication required');
        unauthorizedClient.disconnect();
        done();
      });
    });

    test('다중 클라이언트 동시 연결', async () => {
      const connectionPromises = [];

      // 클라이언트 1 연결
      connectionPromises.push(new Promise((resolve) => {
        client1 = io(TEST_URL, { auth: { user: mockUsers.user1 } });
        client1.on('connect', resolve);
      }));

      // 클라이언트 2 연결
      connectionPromises.push(new Promise((resolve) => {
        client2 = io(TEST_URL, { auth: { user: mockUsers.user2 } });
        client2.on('connect', resolve);
      }));

      // 클라이언트 3 연결
      connectionPromises.push(new Promise((resolve) => {
        client3 = io(TEST_URL, { auth: { user: mockUsers.user3 } });
        client3.on('connect', resolve);
      }));

      await Promise.all(connectionPromises);

      expect(client1.connected).toBe(true);
      expect(client2.connected).toBe(true);
      expect(client3.connected).toBe(true);
    });

    test('연결 해제 및 재연결', async () => {
      client1 = io(TEST_URL, {
        auth: { user: mockUsers.user1 },
        reconnection: true,
        reconnectionDelay: 100,
        reconnectionAttempts: 3,
      });

      // 초기 연결
      await new Promise((resolve) => {
        client1.on('connect', resolve);
      });

      const initialId = client1.id;

      // 연결 해제
      client1.disconnect();
      expect(client1.connected).toBe(false);

      // 재연결
      client1.connect();
      await new Promise((resolve) => {
        client1.on('connect', resolve);
      });

      expect(client1.connected).toBe(true);
      expect(client1.id).not.toBe(initialId); // 새로운 소켓 ID
    });

    test('하트비트(Ping/Pong) 메커니즘', async () => {
      client1 = io(TEST_URL, {
        auth: { user: mockUsers.user1 },
      });

      await new Promise((resolve) => {
        client1.on('connect', resolve);
      });

      const pongReceived = new Promise((resolve) => {
        client1.on('pong', resolve);
      });

      client1.emit('ping');
      await pongReceived;

      expect(client1.connected).toBe(true);
    });
  });

  describe('룸(Room) 관리', () => {
    beforeEach(async () => {
      // 테스트용 클라이언트 연결
      client1 = io(TEST_URL, { auth: { user: mockUsers.user1 } });
      client2 = io(TEST_URL, { auth: { user: mockUsers.user2 } });

      await Promise.all([
        new Promise(resolve => client1.on('connect', resolve)),
        new Promise(resolve => client2.on('connect', resolve)),
      ]);
    });

    test('룸 생성', (done) => {
      const roomData = {
        id: 'room-001',
        name: '프로젝트 알파',
        description: '신규 프로젝트 협업 공간',
        owner: mockUsers.user1.id,
      };

      client1.emit('create-room', roomData);

      client1.on('room-created', (room) => {
        expect(room.id).toBe(roomData.id);
        expect(room.name).toBe(roomData.name);
        expect(room.participants).toContain(mockUsers.user1.id);
        done();
      });
    });

    test('룸 참가', async () => {
      const roomId = 'room-002';

      // User1이 룸 생성
      client1.emit('create-room', {
        id: roomId,
        name: '협업 공간',
        owner: mockUsers.user1.id,
      });

      await wait(100);

      // User2가 룸 참가
      const joinPromise = new Promise((resolve) => {
        client2.on('joined-room', resolve);
      });

      client2.emit('join-room', roomId);

      const joinedData = await joinPromise;
      expect(joinedData).toMatchObject({
        roomId,
        userId: mockUsers.user2.id,
      });
    });

    test('룸 나가기', async () => {
      const roomId = 'room-003';

      // 룸 생성 및 참가
      client1.emit('create-room', {
        id: roomId,
        name: '임시 룸',
        owner: mockUsers.user1.id,
      });

      await wait(100);

      client2.emit('join-room', roomId);
      await wait(100);

      // User2가 룸에서 나감
      const leavePromise = new Promise((resolve) => {
        client1.on('user-left', resolve);
      });

      client2.emit('leave-room', roomId);

      const leftData = await leavePromise;
      expect(leftData).toMatchObject({
        roomId,
        userId: mockUsers.user2.id,
      });
    });

    test('존재하지 않는 룸 참가 시도', (done) => {
      client1.emit('join-room', 'non-existent-room');

      client1.on('error', (error) => {
        expect(error.message).toContain('Room not found');
        done();
      });
    });

    test('룸 목록 조회', async () => {
      // 여러 룸 생성
      const rooms = [
        { id: 'room-list-1', name: '룸1', owner: mockUsers.user1.id },
        { id: 'room-list-2', name: '룸2', owner: mockUsers.user1.id },
        { id: 'room-list-3', name: '룸3', owner: mockUsers.user2.id },
      ];

      for (const room of rooms) {
        const creator = room.owner === mockUsers.user1.id ? client1 : client2;
        creator.emit('create-room', room);
        await wait(50);
      }

      // 룸 목록 요청
      const listPromise = new Promise((resolve) => {
        client1.on('room-list', resolve);
      });

      client1.emit('get-rooms');

      const roomList = await listPromise;
      expect(roomList).toHaveLength(3);
      expect(roomList.map(r => r.id)).toEqual(expect.arrayContaining(rooms.map(r => r.id)));
    });
  });

  describe('실시간 메시징', () => {
    const roomId = 'messaging-room';

    beforeEach(async () => {
      // 클라이언트 연결
      client1 = io(TEST_URL, { auth: { user: mockUsers.user1 } });
      client2 = io(TEST_URL, { auth: { user: mockUsers.user2 } });
      client3 = io(TEST_URL, { auth: { user: mockUsers.user3 } });

      await Promise.all([
        new Promise(resolve => client1.on('connect', resolve)),
        new Promise(resolve => client2.on('connect', resolve)),
        new Promise(resolve => client3.on('connect', resolve)),
      ]);

      // 룸 생성 및 참가
      client1.emit('create-room', {
        id: roomId,
        name: '메시징 테스트',
        owner: mockUsers.user1.id,
      });

      await wait(100);

      client2.emit('join-room', roomId);
      client3.emit('join-room', roomId);

      await wait(100);
    });

    test('룸 내 브로드캐스트 메시지', async () => {
      const message = {
        id: 'msg-001',
        text: '안녕하세요, 팀원 여러분!',
        sender: mockUsers.user1.id,
        timestamp: new Date().toISOString(),
      };

      // 다른 클라이언트들이 메시지를 받을 준비
      const receivePromises = [
        new Promise(resolve => client2.once('message', resolve)),
        new Promise(resolve => client3.once('message', resolve)),
      ];

      // User1이 메시지 전송
      client1.emit('send-message', { roomId, message });

      const receivedMessages = await Promise.all(receivePromises);

      // 모든 클라이언트가 메시지를 받았는지 확인
      receivedMessages.forEach(received => {
        expect(received).toMatchObject({
          roomId,
          message: expect.objectContaining({
            text: message.text,
            sender: message.sender,
          }),
        });
      });
    });

    test('개인 메시지 (Direct Message)', async () => {
      const privateMessage = {
        id: 'dm-001',
        text: '개인 메시지입니다.',
        sender: mockUsers.user1.id,
        recipient: mockUsers.user2.id,
        timestamp: new Date().toISOString(),
      };

      // User2만 메시지를 받아야 함
      const receivePromise = new Promise(resolve => {
        client2.once('private-message', resolve);
      });

      // User3는 메시지를 받으면 안 됨
      let user3ReceivedMessage = false;
      client3.on('private-message', () => {
        user3ReceivedMessage = true;
      });

      // User1이 User2에게 개인 메시지 전송
      client1.emit('send-private-message', privateMessage);

      const receivedMessage = await receivePromise;

      expect(receivedMessage).toMatchObject({
        message: expect.objectContaining({
          text: privateMessage.text,
          sender: privateMessage.sender,
          recipient: privateMessage.recipient,
        }),
      });

      await wait(100);
      expect(user3ReceivedMessage).toBe(false);
    });

    test('타이핑 인디케이터', async () => {
      // User2가 타이핑 시작
      const typingPromise = new Promise(resolve => {
        client1.once('user-typing', resolve);
      });

      client2.emit('typing', {
        roomId,
        userId: mockUsers.user2.id,
        isTyping: true,
      });

      const typingData = await typingPromise;

      expect(typingData).toMatchObject({
        roomId,
        userId: mockUsers.user2.id,
        isTyping: true,
        userName: mockUsers.user2.name,
      });

      // 타이핑 중지
      const stopTypingPromise = new Promise(resolve => {
        client1.once('user-typing', resolve);
      });

      client2.emit('typing', {
        roomId,
        userId: mockUsers.user2.id,
        isTyping: false,
      });

      const stopTypingData = await stopTypingPromise;

      expect(stopTypingData.isTyping).toBe(false);
    });

    test('메시지 수정', async () => {
      const originalMessage = {
        id: 'msg-edit-001',
        text: '원본 메시지',
        sender: mockUsers.user1.id,
        timestamp: new Date().toISOString(),
      };

      // 원본 메시지 전송
      client1.emit('send-message', { roomId, message: originalMessage });
      await wait(100);

      // 메시지 수정
      const editPromise = new Promise(resolve => {
        client2.once('message-edited', resolve);
      });

      client1.emit('edit-message', {
        roomId,
        messageId: originalMessage.id,
        newText: '수정된 메시지',
        editedAt: new Date().toISOString(),
      });

      const editedData = await editPromise;

      expect(editedData).toMatchObject({
        roomId,
        messageId: originalMessage.id,
        newText: '수정된 메시지',
        editor: mockUsers.user1.id,
      });
    });

    test('메시지 삭제', async () => {
      const messageToDelete = {
        id: 'msg-delete-001',
        text: '삭제될 메시지',
        sender: mockUsers.user1.id,
        timestamp: new Date().toISOString(),
      };

      // 메시지 전송
      client1.emit('send-message', { roomId, message: messageToDelete });
      await wait(100);

      // 메시지 삭제
      const deletePromise = new Promise(resolve => {
        client2.once('message-deleted', resolve);
      });

      client1.emit('delete-message', {
        roomId,
        messageId: messageToDelete.id,
      });

      const deletedData = await deletePromise;

      expect(deletedData).toMatchObject({
        roomId,
        messageId: messageToDelete.id,
        deletedBy: mockUsers.user1.id,
      });
    });
  });

  describe('협업 기능', () => {
    const roomId = 'collab-room';
    const documentId = 'doc-001';

    beforeEach(async () => {
      // 클라이언트 연결 및 룸 설정
      client1 = io(TEST_URL, { auth: { user: mockUsers.user1 } });
      client2 = io(TEST_URL, { auth: { user: mockUsers.user2 } });

      await Promise.all([
        new Promise(resolve => client1.on('connect', resolve)),
        new Promise(resolve => client2.on('connect', resolve)),
      ]);

      client1.emit('create-room', {
        id: roomId,
        name: '협업 테스트',
        owner: mockUsers.user1.id,
      });

      await wait(100);
      client2.emit('join-room', roomId);
      await wait(100);
    });

    test('실시간 커서 동기화', async () => {
      const cursorUpdate = {
        userId: mockUsers.user1.id,
        position: { x: 100, y: 200 },
        documentId,
        timestamp: Date.now(),
      };

      const cursorPromise = new Promise(resolve => {
        client2.once('cursor-update', resolve);
      });

      client1.emit('update-cursor', {
        roomId,
        ...cursorUpdate,
      });

      const receivedCursor = await cursorPromise;

      expect(receivedCursor).toMatchObject({
        userId: cursorUpdate.userId,
        position: cursorUpdate.position,
        documentId: cursorUpdate.documentId,
      });
    });

    test('문서 동시 편집', async () => {
      const edit1 = {
        documentId,
        operation: {
          type: 'insert',
          position: 0,
          text: 'Hello ',
        },
        version: 1,
        userId: mockUsers.user1.id,
      };

      const edit2 = {
        documentId,
        operation: {
          type: 'insert',
          position: 6,
          text: 'World!',
        },
        version: 2,
        userId: mockUsers.user2.id,
      };

      // User1의 편집
      const edit1Promise = new Promise(resolve => {
        client2.once('document-edit', resolve);
      });

      client1.emit('edit-document', { roomId, ...edit1 });
      const receivedEdit1 = await edit1Promise;

      expect(receivedEdit1).toMatchObject({
        documentId: edit1.documentId,
        operation: edit1.operation,
        userId: edit1.userId,
      });

      // User2의 편집
      const edit2Promise = new Promise(resolve => {
        client1.once('document-edit', resolve);
      });

      client2.emit('edit-document', { roomId, ...edit2 });
      const receivedEdit2 = await edit2Promise;

      expect(receivedEdit2).toMatchObject({
        documentId: edit2.documentId,
        operation: edit2.operation,
        userId: edit2.userId,
      });
    });

    test('선택 영역 공유', async () => {
      const selection = {
        documentId,
        start: 10,
        end: 25,
        userId: mockUsers.user1.id,
        color: '#FF5733',
      };

      const selectionPromise = new Promise(resolve => {
        client2.once('selection-update', resolve);
      });

      client1.emit('update-selection', {
        roomId,
        ...selection,
      });

      const receivedSelection = await selectionPromise;

      expect(receivedSelection).toMatchObject({
        documentId: selection.documentId,
        start: selection.start,
        end: selection.end,
        userId: selection.userId,
      });
    });

    test('충돌 해결 (Conflict Resolution)', async () => {
      // 동시에 같은 위치 편집
      const conflictingEdit1 = {
        documentId,
        operation: {
          type: 'replace',
          position: 10,
          length: 5,
          text: 'AAAAA',
        },
        version: 3,
        userId: mockUsers.user1.id,
        timestamp: Date.now(),
      };

      const conflictingEdit2 = {
        documentId,
        operation: {
          type: 'replace',
          position: 10,
          length: 5,
          text: 'BBBBB',
        },
        version: 3,
        userId: mockUsers.user2.id,
        timestamp: Date.now() + 10, // 약간 늦게
      };

      // 충돌 해결 이벤트 리스너
      const conflictResolutionPromise = new Promise(resolve => {
        client2.once('conflict-resolved', resolve);
      });

      // 동시 편집 시도
      client1.emit('edit-document', { roomId, ...conflictingEdit1 });
      client2.emit('edit-document', { roomId, ...conflictingEdit2 });

      const resolution = await conflictResolutionPromise;

      expect(resolution).toMatchObject({
        documentId,
        winningEdit: expect.any(Object),
        transformedEdit: expect.any(Object),
        strategy: 'last-write-wins', // 또는 다른 전략
      });
    });

    test('문서 잠금 (Document Locking)', async () => {
      // User1이 문서 잠금
      const lockPromise = new Promise(resolve => {
        client1.once('document-locked', resolve);
      });

      client1.emit('lock-document', {
        roomId,
        documentId,
        userId: mockUsers.user1.id,
      });

      const lockData = await lockPromise;

      expect(lockData).toMatchObject({
        documentId,
        lockedBy: mockUsers.user1.id,
        locked: true,
      });

      // User2가 편집 시도
      const editAttemptPromise = new Promise(resolve => {
        client2.once('edit-denied', resolve);
      });

      client2.emit('edit-document', {
        roomId,
        documentId,
        operation: { type: 'insert', position: 0, text: 'Test' },
      });

      const deniedEdit = await editAttemptPromise;

      expect(deniedEdit).toMatchObject({
        documentId,
        reason: 'Document is locked',
        lockedBy: mockUsers.user1.id,
      });

      // 잠금 해제
      client1.emit('unlock-document', {
        roomId,
        documentId,
      });

      await wait(100);
    });
  });

  describe('사용자 프레즌스', () => {
    const roomId = 'presence-room';

    beforeEach(async () => {
      client1 = io(TEST_URL, { auth: { user: mockUsers.user1 } });
      client2 = io(TEST_URL, { auth: { user: mockUsers.user2 } });

      await Promise.all([
        new Promise(resolve => client1.on('connect', resolve)),
        new Promise(resolve => client2.on('connect', resolve)),
      ]);

      client1.emit('create-room', {
        id: roomId,
        name: '프레즌스 테스트',
        owner: mockUsers.user1.id,
      });

      await wait(100);
    });

    test('온라인 사용자 목록', async () => {
      // User2 참가
      client2.emit('join-room', roomId);
      await wait(100);

      // 온라인 사용자 목록 요청
      const usersPromise = new Promise(resolve => {
        client1.once('online-users', resolve);
      });

      client1.emit('get-online-users', roomId);

      const onlineUsers = await usersPromise;

      expect(onlineUsers).toHaveLength(2);
      expect(onlineUsers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: mockUsers.user1.id }),
          expect.objectContaining({ id: mockUsers.user2.id }),
        ])
      );
    });

    test('사용자 상태 업데이트', async () => {
      client2.emit('join-room', roomId);
      await wait(100);

      const statusUpdate = {
        userId: mockUsers.user1.id,
        status: 'away',
        statusMessage: '잠시 자리 비움',
      };

      const statusPromise = new Promise(resolve => {
        client2.once('user-status-update', resolve);
      });

      client1.emit('update-status', {
        roomId,
        ...statusUpdate,
      });

      const receivedStatus = await statusPromise;

      expect(receivedStatus).toMatchObject(statusUpdate);
    });

    test('사용자 활동 추적', async () => {
      client2.emit('join-room', roomId);
      await wait(100);

      const activity = {
        userId: mockUsers.user1.id,
        action: 'viewing',
        target: 'document-123',
        timestamp: Date.now(),
      };

      const activityPromise = new Promise(resolve => {
        client2.once('user-activity', resolve);
      });

      client1.emit('report-activity', {
        roomId,
        ...activity,
      });

      const receivedActivity = await activityPromise;

      expect(receivedActivity).toMatchObject({
        userId: activity.userId,
        action: activity.action,
        target: activity.target,
      });
    });

    test('비활성 사용자 감지', async () => {
      client2.emit('join-room', roomId);
      await wait(100);

      // 비활성 타임아웃 설정 (테스트용 짧은 시간)
      wsServer.setInactivityTimeout(1000);

      // User2가 비활성 상태가 됨
      const inactivePromise = new Promise(resolve => {
        client1.once('user-inactive', resolve);
      });

      // 1초 대기 (비활성 타임아웃 초과)
      await wait(1100);

      // 서버에서 비활성 감지 트리거
      wsServer.checkInactiveUsers();

      const inactiveData = await inactivePromise;

      expect(inactiveData).toMatchObject({
        userId: mockUsers.user2.id,
        status: 'inactive',
      });
    });
  });

  describe('성능 및 부하 테스트', () => {
    test('대량 메시지 처리', async () => {
      const messageCount = 100;
      const roomId = 'load-test-room';

      // 클라이언트 연결
      client1 = io(TEST_URL, { auth: { user: mockUsers.user1 } });
      client2 = io(TEST_URL, { auth: { user: mockUsers.user2 } });

      await Promise.all([
        new Promise(resolve => client1.on('connect', resolve)),
        new Promise(resolve => client2.on('connect', resolve)),
      ]);

      // 룸 생성 및 참가
      client1.emit('create-room', {
        id: roomId,
        name: '부하 테스트',
        owner: mockUsers.user1.id,
      });

      await wait(100);
      client2.emit('join-room', roomId);
      await wait(100);

      // 메시지 수신 카운터
      let receivedCount = 0;
      client2.on('message', () => {
        receivedCount++;
      });

      // 대량 메시지 전송
      const startTime = Date.now();

      for (let i = 0; i < messageCount; i++) {
        client1.emit('send-message', {
          roomId,
          message: {
            id: `msg-${i}`,
            text: `메시지 ${i}`,
            sender: mockUsers.user1.id,
            timestamp: new Date().toISOString(),
          },
        });
      }

      // 모든 메시지가 도착할 때까지 대기
      await wait(2000);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(receivedCount).toBe(messageCount);
      expect(duration).toBeLessThan(3000); // 3초 이내 처리

      console.log(`✅ ${messageCount}개 메시지 처리 시간: ${duration}ms`);
    });

    test('동시 다수 사용자 처리', async () => {
      const userCount = 20;
      const roomId = 'concurrent-users-room';
      const clients: ClientSocket[] = [];

      // 첫 번째 사용자가 룸 생성
      client1 = io(TEST_URL, { auth: { user: mockUsers.user1 } });
      await new Promise(resolve => client1.on('connect', resolve));

      client1.emit('create-
