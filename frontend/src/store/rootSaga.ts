import { all, fork } from 'redux-saga/effects';
import { chatSaga } from '../features/chat/chatSagas';
import { crmSagas } from '../features/crm/crmSagas';
import { documentsSagas } from '../features/documents/documentsSagas';

export function* rootSaga() {
  yield all([fork(chatSaga), fork(crmSagas), fork(documentsSagas)]);
}
