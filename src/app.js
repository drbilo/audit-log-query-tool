const ALL_AUDIT_LOG_FIELDS = [
  "id", "orgId", "objectType", "objectId", "action", "clientAddr", "clientPort",
  "changedFields", "previousFields", "systemAccessId", "userId", "applicationName",
  "transactionId", "sessionUserName", "remoteAddress", "tokenId", "relid",
  "timestamp", "systemTokenId", "systemUserId", "spaceId", "traceId", "objectName"
];

const USER_LOOKUP_FIELDS = [
  "email", "status", "givenName", "familyName", "provider", "createdAt"
];

const AUDIT_LOG_BASE_QUERY = `
{
  allLogsV2ByObjectId (objectId:"{OBJECT_ID_PLACEHOLDER}",
    first:{FIRST_COUNT_PLACEHOLDER}, offset:{OFFSET_PLACEHOLDER}) {
    nodes {
      {NODES_FIELDS_PLACEHOLDER}
    }
  }
}`;

const USER_BY_ID_BASE_QUERY = `
{
  userById (id:"{USER_ID_PLACEHOLDER}") {
    {USER_FIELDS_PLACEHOLDER}
  }
}`;

function generateQueryString(options = {}) {
  const {
    mode = 'queryBuilder',
    objectId = '',
    firstCount = '20',
    offset = '0',
    selectedFields = [],
    userId = ''
  } = options;

  if (mode === 'userLookup') {
    const userFieldsString = USER_LOOKUP_FIELDS.join('\n    ');
    return USER_BY_ID_BASE_QUERY.replace('{USER_ID_PLACEHOLDER}', userId)
                                .replace('{USER_FIELDS_PLACEHOLDER}', userFieldsString);
  }

  const fieldsString = selectedFields.length > 0 ? selectedFields.join('\n      ') : '';
  let currentQuery = AUDIT_LOG_BASE_QUERY.replace('{OBJECT_ID_PLACEHOLDER}', objectId);
  currentQuery = currentQuery.replace('{FIRST_COUNT_PLACEHOLDER}', firstCount);
  currentQuery = currentQuery.replace('{OFFSET_PLACEHOLDER}', offset);
  currentQuery = currentQuery.replace('{NODES_FIELDS_PLACEHOLDER}', fieldsString);
  return currentQuery;
}

function exportLogsToCsv(logs) {
  const headers = ALL_AUDIT_LOG_FIELDS;
  let csvContent = headers.map(h => `"${h}"`).join(',') + '\n';

  logs.forEach(log => {
    const row = headers.map(header => {
      let value = log[header];
      if (value === null || value === undefined) {
        value = '';
      } else if (typeof value === 'object') {
        value = JSON.stringify(value);
      } else {
        value = String(value);
      }
      if (value.includes(',') || value.includes('"')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvContent += row.join(',') + '\n';
  });

  return csvContent;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateQueryString,
    exportLogsToCsv,
    ALL_AUDIT_LOG_FIELDS,
    USER_LOOKUP_FIELDS,
    AUDIT_LOG_BASE_QUERY,
    USER_BY_ID_BASE_QUERY
  };
} else {
  window.generateQueryString = generateQueryString;
  window.exportLogsToCsv = exportLogsToCsv;
}
