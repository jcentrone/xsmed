let currentInputId = null;

function readURL(input, previewId, iconId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById(previewId).src = e.target.result;
            document.getElementById(previewId).style.display = 'block';
            document.getElementById(iconId).style.display = 'none';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Attach event listener to the main image input
document.getElementById('id_form-0-image').addEventListener('change', () => {
    readURL(document.getElementById('id_form-0-image'), 'main-thumbnail-preview', 'main-upload-icon');
});


// Attach event listeners to all image upload inputs
document.querySelectorAll('input[type="file"][id^="id_form-"]').forEach((input) => {
    const index = input.id.match(/\d+/)[0]; // Extract the index from the input ID
    input.addEventListener('change', () => {
        readURL(input, `thumbnail-preview-${index}`, `upload-icon-${index}`);
    });
});

document.querySelectorAll('.scan-control').forEach((input) => {
    // Extract the index from the input ID
    input.addEventListener('click', () => {
        startScanner();
        document.getElementById('scanModal').style.display = 'block';

    });
});


window.onload = () => {
    document.getElementById('optionModal').style.display = 'block';
    // document.getElementById('optionModal').style.display = 'none';
};

document.getElementById('id_fullPackage').addEventListener('change', (event) => {
    let partialQty = document.getElementById('partial-qty');
    let auctionQty = document.getElementById('id_quantity_available');

    if (event.target.checked) {
        partialQty.style.visibility = 'hidden';
        auctionQty.disabled = false;

    } else {
        partialQty.style.visibility = 'visible';
        auctionQty.value = 1;
        auctionQty.disabled = true;
    }
});

document.getElementById('id_quantity_available').addEventListener('change', (event) => {
    let partialQty = document.getElementById('partial-qty');
    let fullPkgEl = document.getElementById('id_fullPackage');


    if (event.target.value > 1) {
        partialQty.style.visibility = 'hidden';
        fullPkgEl.checked = true;
    } else {
        partialQty.style.visibility = 'visible';
        fullPkgEl.checked = false;

    }
});


const options = {
    scanQRCode: 'scanModal',
    importExcel: 'importModal',
    enterDetails: null // Handle Enter Details Manually option
};

Object.keys(options).forEach(option => {
    document.getElementById(option).onclick = () => {
        document.getElementById('optionModal').style.display = 'none';
        const modalId = options[option];
        if (modalId) document.getElementById(modalId).style.display = 'block';
        if (option === 'scanQRCode') startScanner();
    };
});

// ['closeScanModal', 'closeScanBarcodesModal', 'closeImportModal'].forEach(id => {
//     const closeButton = document.getElementById(id);
//     if (closeButton) {
//         closeButton.onclick = () => {
//             const modalId = id.replace('close', '').toLowerCase();
//             const modal = document.getElementById(modalId);
//             if (modal) {
//                 modal.style.display = 'none';
//             }
//             if (id === 'closeScanModal') stopScanner();
//         };
//     } else {
//         console.error(`Element with ID ${id} not found`);
//     }
// });

document.getElementById('openScanButton').onclick = () => {
    document.getElementById('importModal').style.display = 'none';
    document.getElementById('scanModal').style.display = 'block';
    startScanner();
};

document.getElementById('fileInput').addEventListener('change', handleFileSelect);
document.getElementById('id_udi').addEventListener('change', (e) => {
    parseBarcode(e.target.value);
});


// Scanner Functions
const formatMap = {
    0: 'Aztec',
    1: 'CODABAR',
    2: 'Code 39',
    3: 'Code 93',
    4: 'Code 128',
    5: 'Data Matrix',
    6: 'EAN-8',
    7: 'EAN-13',
    8: 'ITF',
    9: 'MaxiCode',
    10: 'PDF 417',
    11: 'QR Code',
    12: 'RSS 14',
    13: 'RSS Expanded',
    14: 'UPC-A',
    15: 'UPC-E',
    16: 'UPC-EAN Extension'
};

const scannedBarcodes = [];

let codeReader;

function startScanner() {
    codeReader = new ZXing.BrowserMultiFormatReader();
    codeReader.decodeFromVideoDevice(null, 'video', (result, err) => {
        if (result) {
            console.log(result);
            processDetectedBarcode(result);
        }
        if (err && !(err instanceof ZXing.NotFoundException)) {
            console.error(err);
        }
    });

    function processDetectedBarcode(result) {
        const code = result.text;
        const format = formatMap[result.format];

        if (!scannedBarcodes.find(item => item.code === code)) {
            const parsedResult = format === 'QR Code' || format === 'Data Matrix'
                ? parseQRCode(code)
                : parseGS1Barcode(code);

            scannedBarcodes.push({code: code, format: format, parsed: parsedResult});
            displayDetectedBarcode(code, format, parsedResult);
        }
    }

    const aiOptions = [
        {label: 'GTIN/UDI', value: '01'},
        {label: 'Batch or Lot Number', value: '10'},
        {label: 'Production Date', value: '11'},
        {label: 'Expiration Date', value: '17'},
        {label: 'Reference Number', value: 'ref'},
        {label: 'Unknown/Not Needed', value: 'Unknown'}
    ];

    function displayDetectedBarcode(code, format, parsedResult) {
        const barcodeResults = document.getElementById('barcode-results');
        const resultDiv = document.getElementById('mapping-table');


        for (const [key, value] of Object.entries(parsedResult)) {
            const row = document.createElement('div');
            row.classList.add('mapping-row');

            const leftCell = document.createElement('div');
            leftCell.classList.add('mapping-cell');
            const select = document.createElement('select');
            select.classList.add('form-control');

            aiOptions.forEach(option => {
                const opt = document.createElement('option');
                opt.value = option.value;
                opt.innerText = option.label;
                if (option.label === key) {
                    opt.selected = true;
                }
                select.appendChild(opt);
            });

            leftCell.appendChild(select);

            const arrowCell = document.createElement('div');
            arrowCell.classList.add('arrow');
            arrowCell.innerHTML = `<i class="fa-solid fa-arrow-right"></i>`;

            const rightCell = document.createElement('div');
            rightCell.classList.add('mapping-cell');
            let formattedDate;
            if (key === 'Production Date' || key === 'Expiration Date') {
                formattedDate = convertDate(value);
            } else {
                formattedDate = value;
            }
            rightCell.innerText = formattedDate;


            row.appendChild(leftCell);
            row.appendChild(arrowCell);
            row.appendChild(rightCell);


            resultDiv.appendChild(row);
        }

        barcodeResults.appendChild(resultDiv);

        // Save the structured data in the JSON variable
        // structuredData.push(parsedResult);
        // console.log('Structured Data:', JSON.stringify(structuredData, null, 2));
    }


    function parseQRCode(code) {
        const sanitizedCode = code.replace(/[^ -~]+/g, ""); // Remove non-printable ASCII characters
        const aiPatterns = {
            "01": "GTIN",
            "10": "Batch or Lot Number",
            "11": "Production Date",
            "17": "Expiration Date",
            // Add more AI patterns as needed
        };
        const parsedResult = {};
        let remainingCode = sanitizedCode;
        while (remainingCode.length > 0) {
            const ai = remainingCode.substring(0, 2);
            if (aiPatterns[ai]) {
                const field = aiPatterns[ai];
                let length;
                if (ai === "01") length = 14; // GTIN length
                else if (ai === "10") length = 20; // Lot Number max length
                else length = 6; // Dates length
                const value = remainingCode.substring(2, 2 + length).replace(/[^0-9A-Za-z]/g, "");
                parsedResult[field] = value;
                remainingCode = remainingCode.substring(2 + length);
            } else {
                remainingCode = remainingCode.substring(2);
            }
        }
        console.log(parsedResult);
        return parsedResult;
    }

    function parseGS1Barcode(code) {
        const aiMap = {
            '00': 'SSCC',
            '01': 'GTIN',
            '10': 'Batch or Lot Number',
            '11': 'Production Date',
            '17': 'Expiration Date',
            '21': 'Serial Number',
            '310': 'Net Weight (kg)',
            '320': 'Net Weight (lb)',
            // Add more AIs as needed
        };

        const fixedLengths = {
            '00': 18,
            '01': 14,
            '11': 6,
            '17': 6
        };

        let index = 0;
        const length = code.length;
        const parsedResult = {};
        let unknownIndex = 1;

        while (index < length) {
            let ai = code.substring(index, index + 2);
            let aiInfo = aiMap[ai];

            if (!aiInfo) {
                ai = code.substring(index, index + 3);
                aiInfo = aiMap[ai];
            }

            if (aiInfo) {
                index += ai.length;

                // Determine length of the value
                let value;
                if (fixedLengths[ai]) {
                    value = code.substring(index, index + fixedLengths[ai]);
                    index += fixedLengths[ai];
                } else {
                    let endIndex = code.indexOf(',', index);
                    if (endIndex === -1) {
                        endIndex = length;
                    }
                    value = code.substring(index, endIndex);
                    index = endIndex + 1;
                }

                parsedResult[aiInfo] = value.replace(/[^0-9A-Za-z]/g, "");
            } else {
                // Handle unknown AI
                let endIndex = code.indexOf(',', index);
                if (endIndex === -1) {
                    endIndex = length;
                }
                const unknownValue = code.substring(index, endIndex);
                parsedResult[`Unknown/Not Needed`] = unknownValue.replace(/[^0-9A-Za-z]/g, "");
                index = endIndex + 1;
            }
        }

        console.log(parsedResult);
        return parsedResult;
    }
}

function stopScanner() {
    if (codeReader) {
        codeReader.reset();
        const video = document.getElementById('video');
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        console.log('Scanner stopped.');
    }
}

// API Functions
function parseBarcode(code) {
    if (code) {
        fetch(`https://accessgudid.nlm.nih.gov/api/v3/parse_udi.json?udi=${code}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log("Device data from AccessGUDID:", data);


                fetchDeviceData(data.udi);

                // populateForm(data);
            })
            .catch(error => console.error('Error fetching device data:', error));
    }
}

function fetchDeviceData(code) {
    fetch(`https://accessgudid.nlm.nih.gov/api/v3/devices/lookup.json?udi=${code}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log("Device data from AccessGUDID:", data);
            populateForm(data);
            fetchClassificationData(data.gudid.device.productCodes.fdaProductCode[0].productCode);
        })
        .catch(error => console.error('Error fetching device data:', error));
}

function fetchClassificationData(code) {
    fetch(`https://api.fda.gov/device/classification.json?search=product_code:${code}&limit=5`)
        .then(response => response.json())
        .then(data => {
            console.log("Device data from AccessGUDID Classification:", data);

            let classificationData = {
                medical_specialty_description: data.results[0].medical_specialty_description,
                device_class: data.results[0].device_class,
                device_name: data.results[0].device_name
            };
            console.log("Classification Data:", classificationData);

            return fetch('/api/classify-device/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()  // Function to get CSRF token
                },
                body: JSON.stringify(classificationData)
            });
        })
        .then(response => response.json())
        .then(result => {
            console.log(result);
            updateCategoryDropdown(result);
        })
        .catch(error => console.error('Error in processing:', error));
}

function updateCategoryDropdown(result) {
    const selectElement = document.getElementById('id_category');
    const parsedResult = result.category; // Ensure this parsing matches the actual response structure
    // console.log(parsedResult);

    const newValue = parsedResult.value;
    const newText = parsedResult.category_name;

    let optionExists = Array.from(selectElement.options).some(option => {
        if (option.value === newValue || option.textContent === newText) {
            option.selected = true; // Select if it exists
            return true;
        }
        return false;
    });

    if (!optionExists) {
        const newOption = document.createElement('option');
        newOption.value = newValue;
        newOption.textContent = newText;
        newOption.selected = true;
        selectElement.appendChild(newOption);
    }
}


function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]').getAttribute('content');
}

function populateForm(data) {
    if (data && data.gudid && data.gudid.device) {
        const device = data.gudid.device;
        document.getElementById('id_product_name').value = device.brandName || '';
        document.getElementById('id_description').value = device.deviceDescription || '';
        document.getElementById('id_manufacturer').value = toProperCase(device.companyName) || '';


        let packageQuantity = '';
        let packageType = '';

        if (device.identifiers && device.identifiers.identifier) {
            for (const identifier of device.identifiers.identifier) {
                if (identifier.deviceIdType === "Package") {
                    packageQuantity = identifier.pkgQuantity || '';
                    packageType = toProperCase(identifier.pkgType || '');
                    break;
                } else {
                    packageQuantity = device.deviceCount || '';
                }
            }
        }


        document.getElementById('id_title').value = device.brandName + " - " + device.deviceDescription;
        document.getElementById('id_package_type').value = packageType;
        document.getElementById('id_package_quantity').value = packageQuantity;
        document.getElementById('id_deviceSterile').checked = device.sterilization.deviceSterile || false;
        document.getElementById('id_fullPackage').checked = device.deviceStatus || false;
    } else {
        console.log("No device data found");
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet, {header: 1, raw: true});

            generatePreviewTable(json);
            generateMappingTable(json);
            document.getElementById('import-button').style.display = 'block';
            document.getElementById('fileInput').style.display = 'none';
            document.getElementById('import-modal-content').style.maxWidth = 'unset';
        };
        reader.readAsArrayBuffer(file);
    }
}

function generatePreviewTable(data) {
    const previewTableHead = document.getElementById('previewTableHead');
    const previewTableBody = document.getElementById('previewTableBody');
    previewTableHead.innerHTML = '';
    previewTableBody.innerHTML = '';

    const headerRow = document.createElement('tr');
    data[0].forEach(header => {
        const th = document.createElement('th');
        th.innerText = header;
        headerRow.appendChild(th);
    });
    previewTableHead.appendChild(headerRow);

    data.slice(1, 6).forEach(row => {
        const tr = document.createElement('tr');
        row.forEach(cell => {
            const td = document.createElement('td');
            td.innerText = typeof cell === 'number' && isExcelDate(cell) ? formatDate(cell) : cell;
            tr.appendChild(td);
        });
        previewTableBody.appendChild(tr);
    });

    document.getElementById('previewContainer').style.display = 'block';
}

function isExcelDate(value) {
    return value > 25569;
}

function toProperCase(str) {
    return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

function formatDate(excelDate) {
    const date = new Date((excelDate - (25567 + 1)) * 86400 * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}

function convertDate(dateString) {

    let formattedDate;

    if (dateString.length === 6) {
        // Extract components from the input string
        const year = dateString.substring(0, 2);
        const month = dateString.substring(2, 4);
        const day = dateString.substring(4, 6);

        // Convert the year to YYYY format
        const fullYear = `20${year}`;

        // Format the date as MM/DD/YYYY
        formattedDate = `${month}/${day}/${fullYear}`;

        return formattedDate;
    } else if (dateString.length === 8) {
        // Extract components from the input string
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);


        // Format the date as MM/DD/YYYY
        formattedDate = `${month}/${day}/${year}`;

        return formattedDate;
    }


}

function generateMappingTable(data) {
    const headers = data[0];
    const formFields = [
        {label: 'Product Name', value: 'title'},
        {label: 'Description', value: 'description'},
        {label: 'Category', value: 'category'},
        {label: 'Starting Bid', value: 'starting_bid'},
        {label: 'Reserve Bid', value: 'reserve_bid'},
        {label: 'Auction Duration', value: 'auction_duration'},
        {label: 'Manufacturer', value: 'manufacturer'},
        {label: 'Reference Number', value: 'reference_number'},
        {label: 'Lot Number', value: 'lot_number'},
        {label: 'Expiration Date', value: 'expiration_date'},
        {label: 'Package Type', value: 'package_type'},
        {label: 'Package Quantity', value: 'package_quantity'},
        {label: 'Device Sterile', value: 'deviceSterile'},
        {label: 'Full Package', value: 'fullPackage'}
    ];

    const mappingTable = document.getElementById('mappingTable');
    mappingTable.innerHTML = '';

    headers.forEach(header => {
        const row = document.createElement('tr');

        const fileHeaderCell = document.createElement('td');
        fileHeaderCell.innerText = header;
        row.appendChild(fileHeaderCell);

        const arrowCell = document.createElement('td');
        arrowCell.innerHTML = '<i class="fa-solid fa-arrow-right"></i>';
        row.appendChild(arrowCell);

        const formFieldCell = document.createElement('td');
        const select = document.createElement('select');
        select.classList.add('form-control');
        formFields.forEach(field => {
            const option = document.createElement('option');
            option.value = field.value;
            option.innerText = field.label;
            if (field.label.toLowerCase() === header.toLowerCase()) option.selected = true;
            select.appendChild(option);
        });
        formFieldCell.appendChild(select);
        row.appendChild(formFieldCell);

        mappingTable.appendChild(row);
    });

    document.getElementById('mappingContainer').style.display = 'block';
}

// Add event listeners to scan buttons for individual barcode fields
document.querySelectorAll('[id^="scanButton-"]').forEach(button => {
    button.addEventListener('click', () => {
        const inputId = button.getAttribute('data-input');
        startScanner(inputId);
        document.getElementById('scanModal').style.display = 'block';
    });
});


// Event listener for the Save button
document.getElementById('closeScanModal').addEventListener('click', function () {
    transferDataToAuctionForm();
});

// Function to extract data from the mapping table
function extractMappingTableData() {
    const rows = document.querySelectorAll('#mapping-table .mapping-row');
    const data = {};

    rows.forEach(row => {
        const key = row.querySelector('select').value;
        const value = row.querySelector('.mapping-cell:last-child').innerText;
        data[key] = value;
    });

    return data;
}

// Function to map extracted data to the auction form fields
function transferDataToAuctionForm() {
    const data = extractMappingTableData();
    console.log(data);

    // Mapping keys to form field IDs
    const fieldMap = {
        '01': 'id_udi',  // GTIN/UDI
        '10': 'id_lot_number',  // Batch or Lot Number
        '11': 'id_production_date',  // Production Date (assuming you have this field)
        '17': 'id_expiration_date',  // Expiration Date
        'ref': 'id_reference_number' // Reference Number
        // Add more mappings as needed
    };

    for (const [key, value] of Object.entries(data)) {
        const fieldId = fieldMap[key];
        if (fieldId) {
            let field = document.getElementById(fieldId);

            if (fieldId === 'id_udi') {
                parseBarcode('01' + value);
                field.value = '01' + value;
            } else if (fieldId === 'id_production_date' || fieldId === 'id_expiration_date') {
                if (!value.includes("/")) {
                    field.value = convertDate(value);
                } else {
                    field.value = value;
                }
            } else {
                field.value = value;
            }


        }
    }
    stopScanner();
    document.getElementById('scanModal').style.display = 'none';
}

document.getElementById('infoIcon').addEventListener('mouseover', function () {
    document.querySelector('.tooltip').style.visibility = 'visible';
    document.querySelector('.tooltip').style.opacity = 1;
});
document.getElementById('infoIcon').addEventListener('mouseout', function () {
    document.querySelector('.tooltip').style.visibility = 'hidden';
    document.querySelector('.tooltip').style.opacity = 0;
});