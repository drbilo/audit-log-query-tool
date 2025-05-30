// Get references to DOM elements
const endpointInput = document.getElementById('endpoint');
const bearerTokenInput = document.getElementById('bearerToken');
const objectIdInput = document.getElementById('objectIdInput');
const firstCountInput = document.getElementById('firstCountInput');
const offsetInput = document.getElementById('offsetInput');
const rawQueryInput = document.getElementById('rawQueryInput');
const executeButton = document.getElementById('executeQuery');
const resultPre = document.getElementById('result');
const messageBox = document.getElementById('messageBox');
const loadingSpinner = document.getElementById('loadingSpinner');

const nextPageButton = document.getElementById('nextPageButton');
const nextPageSpinner = document.getElementById('nextPageSpinner');
const previousPageButton = document.getElementById('previousPageButton'); // New previous page button
const previousPageSpinner = document.getElementById('previousPageSpinner'); // New previous page spinner

const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

const fieldsToggle = document.getElementById('fieldsToggle');
const fieldsContent = document.getElementById('fieldsContent');
const accordionArrow = document.getElementById('accordionArrow');
const fieldsCheckboxesContainer = document.getElementById('fieldsCheckboxesContainer');

const userIdInput = document.getElementById('userIdInput');

let lastQueryResultNodesCount = 0;

// All possible audit log fields
const ALL_AUDIT_LOG_FIELDS = [
    "id", "orgId", "objectType", "objectId", "action", "clientAddr", "clientPort",
    "changedFields", "previousFields", "systemAccessId", "userId", "applicationName",
    "transactionId", "sessionUserName", "remoteAddress", "tokenId", "relid",
    "timestamp", "systemTokenId", "systemUserId", "spaceId", "traceId", "objectName"
];

// Default selected fields for the initial audit log query
const DEFAULT_SELECTED_AUDIT_LOG_FIELDS = [
    "id", "objectId", "objectType", "objectName", "action", "timestamp", "changedFields", "previousFields", "userId"
];

// Fields for userById query
const USER_LOOKUP_FIELDS = [
    "email", "status", "givenName", "familyName", "provider", "createdAt"
];

// Base GraphQL query for audit logs
const AUDIT_LOG_BASE_QUERY = `
{
  allLogsV2ByObjectId (objectId:"{OBJECT_ID_PLACEHOLDER}",
    first:{FIRST_COUNT_PLACEHOLDER}, offset:{OFFSET_PLACEHOLDER}) {
    nodes {
      {NODES_FIELDS_PLACEHOLDER}
    }
  }
}
`;

// Base GraphQL query for userById
const USER_BY_ID_BASE_QUERY = `
{
  userById (id:"{USER_ID_PLACEHOLDER}") {
    {USER_FIELDS_PLACEHOLDER}
  }
}
`;

/**
 * Populates the "Fields to Return" checkboxes and sets default selections.
 */
function populateFieldsCheckboxes() {
    fieldsCheckboxesContainer.innerHTML = '';
    ALL_AUDIT_LOG_FIELDS.forEach(field => {
        const div = document.createElement('div');
        div.classList.add('checkbox-item');

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = `field-${field}`;
        input.value = field;
        input.classList.add('rounded', 'text-indigo-600', 'focus:ring-indigo-500');

        if (DEFAULT_SELECTED_AUDIT_LOG_FIELDS.includes(field)) {
            input.checked = true;
        }

        input.addEventListener('change', validateInputs);

        const label = document.createElement('label');
        label.htmlFor = `field-${field}`;
        label.textContent = field;
        label.classList.add('text-gray-700');

        div.appendChild(input);
        div.appendChild(label);
        fieldsCheckboxesContainer.appendChild(div);
    });
}

/**
 * Validates the required input fields and enables/disables the execute and next page buttons.
 */
function validateInputs() {
    const endpoint = endpointInput.value.trim();
    const bearerToken = bearerTokenInput.value.trim();
    let isExecuteButtonValid = false;
    let isNextPageButtonValid = false;
    let isPreviousPageButtonValid = false; // New validation for previous button

    const activeTabId = document.querySelector('.tab-content.active').id;

    if (activeTabId === 'raw-query-tab') {
        const rawQueryContent = rawQueryInput.value.trim();
        isExecuteButtonValid = endpoint.length > 0 && bearerToken.length > 0 && rawQueryContent.length > 0;
        isNextPageButtonValid = false;
        isPreviousPageButtonValid = false;
    } else if (activeTabId === 'user-lookup-tab') {
        const userId = userIdInput.value.trim();
        isExecuteButtonValid = endpoint.length > 0 && bearerToken.length > 0 && userId.length > 0;
        isNextPageButtonValid = false;
        isPreviousPageButtonValid = false;
    } else { // Query Builder tab is active
        const objectId = objectIdInput.value.trim();
        const firstCount = parseInt(firstCountInput.value.trim(), 10);
        const offset = parseInt(offsetInput.value.trim(), 10);
        const selectedFields = Array.from(document.querySelectorAll('#fieldsCheckboxesContainer input[type="checkbox"]:checked'));

        isExecuteButtonValid = endpoint.length > 0 && bearerToken.length > 0 && objectId.length > 0 &&
                               !isNaN(firstCount) && firstCount >= 1 &&
                               !isNaN(offset) && offset >= 0 &&
                               selectedFields.length > 0;

        isNextPageButtonValid = isExecuteButtonValid && (lastQueryResultNodesCount === firstCount);
        isPreviousPageButtonValid = isExecuteButtonValid && (offset > 0); // Enable if offset is greater than 0
    }

    executeButton.disabled = !isExecuteButtonValid;
    nextPageButton.disabled = !isNextPageButtonValid;
    previousPageButton.disabled = !isPreviousPageButtonValid; // Set disabled state for previous button
}

/**
 * Generates the GraphQL query string based on current input values and active tab.
 * @returns {string} The generated GraphQL query string.
 */
function generateQueryString() {
    const activeTabId = document.querySelector('.tab-content.active').id;

    if (activeTabId === 'user-lookup-tab') {
        const userId = userIdInput.value.trim();
        const userFieldsString = USER_LOOKUP_FIELDS.join('\n    ');
        return USER_BY_ID_BASE_QUERY.replace('{USER_ID_PLACEHOLDER}', userId)
                                   .replace('{USER_FIELDS_PLACEHOLDER}', userFieldsString);
    } else { // Default to Audit Log Query
        const objectId = objectIdInput.value.trim();
        const firstCount = firstCountInput.value.trim();
        const offset = offsetInput.value.trim();

        const selectedFields = Array.from(document.querySelectorAll('#fieldsCheckboxesContainer input[type="checkbox"]:checked'))
                            .map(checkbox => checkbox.value);

        const fieldsString = selectedFields.length > 0 ? selectedFields.join('\n      ') : '';

        let currentQuery = AUDIT_LOG_BASE_QUERY.replace('{OBJECT_ID_PLACEHOLDER}', objectId);
        currentQuery = currentQuery.replace('{FIRST_COUNT_PLACEHOLDER}', firstCount || '20');
        currentQuery = currentQuery.replace('{OFFSET_PLACEHOLDER}', offset || '0');
        currentQuery = currentQuery.replace('{NODES_FIELDS_PLACEHOLDER}', fieldsString);

        return currentQuery;
    }
}

/**
 * Shows the specified tab content and sets the active state for tab buttons.
 * @param {string} tabId - The ID of the tab content to show.
 */
function showTab(tabId) {
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });

    document.getElementById(tabId).classList.add('active');
    document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add('active');

    if (tabId === 'raw-query-tab') {
        rawQueryInput.value = generateQueryString();
    }
    validateInputs(); // Re-validate when tab changes
}

/**
 * Displays a message in the message box.
 * @param {string} message - The message to display.
 * @param {string} type - The type of message ('success', 'error', 'info').
 */
function showMessage(message, type = 'info') {
    messageBox.textContent = message;
    messageBox.className = `message-box ${type}`;
    messageBox.classList.remove('hidden');
}

/**
 * Hides the message box.
 */
function hideMessage() {
    messageBox.classList.add('hidden');
}

/**
 * Executes the GraphQL query.
 * @param {boolean} isPaginationCall - True if this call is from a pagination button.
 */
async function executeGraphQLQuery(isPaginationCall = false) {
    hideMessage();
    resultPre.textContent = 'Loading...';
    executeButton.disabled = true;
    nextPageButton.disabled = true;
    previousPageButton.disabled = true; // Disable previous button during query
    loadingSpinner.classList.remove('hidden');
    if (isPaginationCall) {
         nextPageSpinner.classList.remove('hidden');
         previousPageSpinner.classList.remove('hidden'); // Show spinner for previous button too
    }

    const endpoint = endpointInput.value;
    const bearerToken = bearerTokenInput.value.trim();

    let finalQuery;
    const activeTabId = document.querySelector('.tab-content.active').id;

    if (activeTabId === 'raw-query-tab') {
        finalQuery = rawQueryInput.value.trim();
        if (!finalQuery) {
            showMessage('Please enter a GraphQL Query in the Raw Query tab.', 'error');
            resultPre.textContent = '';
            executeButton.disabled = false;
            loadingSpinner.classList.add('hidden');
            if (isPaginationCall) { nextPageSpinner.classList.add('hidden'); previousPageSpinner.classList.add('hidden'); }
            validateInputs();
            return;
        }
    } else if (activeTabId === 'user-lookup-tab') {
        const userId = userIdInput.value.trim();
        if (!userId) {
             showMessage('Please enter a User ID in the User Lookup tab.', 'error');
             resultPre.textContent = '';
             executeButton.disabled = false;
             loadingSpinner.classList.add('hidden');
             validateInputs();
             return;
        }
        finalQuery = generateQueryString();
    }
    else { // Query Builder tab is active
        const objectId = objectIdInput.value.trim();
        const firstCount = parseInt(firstCountInput.value.trim(), 10);
        const offset = parseInt(offsetInput.value.trim(), 10);
        const selectedFields = Array.from(document.querySelectorAll('#fieldsCheckboxesContainer input[type="checkbox"]:checked'));


        if (!objectId) {
            showMessage('Please enter an Object ID in the Query Builder tab.', 'error');
            resultPre.textContent = '';
            executeButton.disabled = false;
            loadingSpinner.classList.add('hidden');
            if (isPaginationCall) { nextPageSpinner.classList.add('hidden'); previousPageSpinner.classList.add('hidden'); }
            validateInputs();
            return;
        }

        if (isNaN(firstCount) || firstCount < 1) {
            showMessage('Please enter a valid number (1 or greater) for "Number of Logs to Return".', 'error');
            resultPre.textContent = '';
            executeButton.disabled = false;
            loadingSpinner.classList.add('hidden');
            if (isPaginationCall) { nextPageSpinner.classList.add('hidden'); previousPageSpinner.classList.add('hidden'); }
            validateInputs();
            return;
        }

        if (isNaN(offset) || offset < 0) {
            showMessage('Please enter a valid number (0 or greater) for "Offset".', 'error');
            resultPre.textContent = '';
            executeButton.disabled = false;
            loadingSpinner.classList.add('hidden');
            if (isPaginationCall) { nextPageSpinner.classList.add('hidden'); previousPageSpinner.classList.add('hidden'); }
            validateInputs();
            return;
        }
        if (selectedFields.length === 0) {
            showMessage('Please select at least one field to return in the Query Builder tab.', 'error');
            resultPre.textContent = '';
            executeButton.disabled = false;
            loadingSpinner.classList.add('hidden');
            if (isPaginationCall) { nextPageSpinner.classList.add('hidden'); previousPageSpinner.classList.add('hidden'); }
            validateInputs();
            return;
        }
        finalQuery = generateQueryString();
    }

    if (!endpoint) {
        showMessage('Please select a GraphQL Endpoint.', 'error');
        resultPre.textContent = '';
        executeButton.disabled = false;
        loadingSpinner.classList.add('hidden');
        if (isPaginationCall) { nextPageSpinner.classList.add('hidden'); previousPageSpinner.classList.add('hidden'); }
        validateInputs();
        return;
    }

    if (!bearerToken) {
        showMessage('Please enter a Bearer Token.', 'error');
        resultPre.textContent = '';
        executeButton.disabled = false;
        loadingSpinner.classList.add('hidden');
        if (isPaginationCall) { nextPageSpinner.classList.add('hidden'); previousPageSpinner.classList.add('hidden'); }
        validateInputs();
        return;
    }

    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    if (bearerToken) {
        headers['Authorization'] = `Bearer ${bearerToken}`;
    }

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                query: finalQuery
            })
        });

        const data = await response.json();

        // Only update lastQueryResultNodesCount for the Audit Log tab
        if (activeTabId === 'query-builder-tab') {
            lastQueryResultNodesCount = (data.data && data.data.allLogsV2ByObjectId && data.data.allLogsV2ByObjectId.nodes)
                                         ? data.data.allLogsV2ByObjectId.nodes.length
                                         : 0;
        } else {
            lastQueryResultNodesCount = 0; // Reset for other tabs where pagination is not applicable
        }


        if (!response.ok) {
            showMessage(`HTTP Error: ${response.status} ${response.statusText}`, 'error');
        } else if (data.errors && data.errors.length > 0) {
            const errorMessage = data.errors[0].message || 'An unknown GraphQL error occurred.';
            showMessage(`Query executed with errors! Error: ${errorMessage}`, 'error');
        } else {
            showMessage('Query executed successfully!', 'success');
        }

        resultPre.textContent = JSON.stringify(data, null, 2);

    } catch (error) {
        console.error('Error executing GraphQL query:', error);
        showMessage(`Failed to execute query: ${error.message}`, 'error');
        resultPre.textContent = 'Error: Could not connect to the endpoint or parse response.';
    } finally {
        executeButton.disabled = false;
        loadingSpinner.classList.add('hidden');
        if (isPaginationCall) { nextPageSpinner.classList.add('hidden'); previousPageSpinner.classList.add('hidden'); }
        validateInputs(); // Re-validate to ensure button state is correct after operation
    }
}

/**
 * Handles the click event for the "Next Page" button.
 */
function handleNextPage() {
    if (document.querySelector('.tab-content.active').id !== 'query-builder-tab') {
        showMessage('Pagination is only available in the "Query Builder" tab.', 'info');
        return;
    }

    const currentOffset = parseInt(offsetInput.value.trim(), 10);
    const firstCount = parseInt(firstCountInput.value.trim(), 10);

    if (isNaN(currentOffset) || isNaN(firstCount) || firstCount < 1) {
        showMessage('Invalid "Number of Logs to Return" or "Offset" for pagination.', 'error');
        return;
    }

    // Increment offset and re-run query
    offsetInput.value = currentOffset + firstCount;
    executeGraphQLQuery(true); // Pass true to indicate it's a next page call
}

/**
 * Handles the click event for the "Previous Page" button.
 */
function handlePreviousPage() {
    if (document.querySelector('.tab-content.active').id !== 'query-builder-tab') {
        showMessage('Pagination is only available in the "Query Builder" tab.', 'info');
        return;
    }

    const currentOffset = parseInt(offsetInput.value.trim(), 10);
    const firstCount = parseInt(firstCountInput.value.trim(), 10);

    if (isNaN(currentOffset) || isNaN(firstCount) || firstCount < 1) {
        showMessage('Invalid "Number of Logs to Return" or "Offset" for pagination.', 'error');
        return;
    }

    // Decrement offset, ensuring it doesn't go below 0
    offsetInput.value = Math.max(0, currentOffset - firstCount);
    executeGraphQLQuery(true); // Pass true to indicate it's a pagination call
}


// Add event listener to the execute button
executeButton.addEventListener('click', () => executeGraphQLQuery(false)); // Pass false for regular execution

// Add event listener for the new "Next Page" button
nextPageButton.addEventListener('click', handleNextPage);

// Add event listener for the new "Previous Page" button
previousPageButton.addEventListener('click', handlePreviousPage);

// Add event listeners for tab switching
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        showTab(button.dataset.tab);
    });
});

// Accordion toggle functionality
fieldsToggle.addEventListener('click', () => {
    fieldsContent.classList.toggle('expanded');
    accordionArrow.classList.toggle('rotate');
});


// Add event listeners to trigger validation
endpointInput.addEventListener('change', validateInputs);
bearerTokenInput.addEventListener('input', validateInputs);
objectIdInput.addEventListener('input', validateInputs);
firstCountInput.addEventListener('input', validateInputs);
offsetInput.addEventListener('input', validateInputs);
rawQueryInput.addEventListener('input', validateInputs);
userIdInput.addEventListener('input', validateInputs);

// Initialize the app on load
window.onload = () => {
    objectIdInput.value = '';
    firstCountInput.value = '20';
    offsetInput.value = '0';
    userIdInput.value = '';
    populateFieldsCheckboxes();
    showTab('query-builder-tab');
    validateInputs();
};
