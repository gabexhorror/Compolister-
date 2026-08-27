// Common resistor values (E12 series)
const resistorValues = [
    '0.1Ω', '0.22Ω', '0.47Ω', '1Ω', '1.5Ω', '2.2Ω', '3.3Ω', '4.7Ω', '6.8Ω',
    '10Ω', '15Ω', '22Ω', '33Ω', '47Ω', '68Ω',
    '100Ω', '150Ω', '220Ω', '330Ω', '470Ω', '680Ω',
    '1kΩ', '1.5kΩ', '2.2kΩ', '3.3kΩ', '4.7kΩ', '6.8kΩ',
    '10kΩ', '15kΩ', '22kΩ', '33kΩ', '47kΩ', '68kΩ',
    '100kΩ', '150kΩ', '220kΩ', '330kΩ', '470kΩ', '680kΩ',
    '1MΩ', '1.5MΩ', '2.2MΩ', '3.3MΩ', '4.7MΩ', '6.8MΩ',
    '10MΩ'
];

// Common capacitor values
const capacitorValues = [
    '1pF', '2.2pF', '4.7pF', '10pF', '22pF', '47pF', '100pF',
    '220pF', '470pF', '1nF', '2.2nF', '4.7nF', '10nF', '22nF', '47nF',
    '100nF', '220nF', '470nF', '1µF', '2.2µF', '4.7µF', '10µF', '22µF',
    '47µF', '100µF', '220µF', '470µF', '1000µF', '2200µF', '4700µF'
];

// Resistor tolerance options
const resistorTolerances = ['0.1%', '0.5%', '1%', '2%', '5%', '10%', '20%'];

// Resistor wattage options
const resistorWattages = ['0.125W', '0.25W', '0.5W', '1W', '2W', '3W', '5W', '10W'];

// Capacitor types
const capacitorTypes = ['Ceramic', 'Electrolytic', 'Film', 'Tantalum', 'Supercapacitor'];

// Capacitor voltage ratings
const capacitorVoltages = ['6.3V', '10V', '16V', '25V', '35V', '50V', '63V', '100V', '250V', '400V', '630V'];

// Global state
let components = [];
let projects = [];
let editingComponentId = null;
let editingProjectId = null;

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadComponents();
    loadProjects();
    setupNavigation();
});

// Navigation
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all nav items
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            // Remove active class from all tabs
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            
            // Add active class to clicked nav item
            item.classList.add('active');
            
            // Show corresponding tab
            const tabName = item.dataset.tab;
            document.getElementById(tabName + '-tab').classList.add('active');
        });
    });
}

// Load components
async function loadComponents() {
    try {
        const response = await fetch('/api/components');
        components = await response.json();
        displayComponents(components);
        updateDashboard();
    } catch (error) {
        console.error('Error loading components:', error);
    }
}

// Display components as cards
function displayComponents(componentsList) {
    const grid = document.getElementById('componentsGrid');
    grid.innerHTML = '';
    
    componentsList.forEach(component => {
        const card = createComponentCard(component);
        grid.appendChild(card);
    });
}

// Create component card
function createComponentCard(component) {
    const card = document.createElement('div');
    card.className = 'component-card';
    
    let codeHtml = '';
    
    // Add color code for resistors
    if (component.type === 'resistor' && component.color_code) {
        codeHtml = `
            <div class="color-code">
                ${component.color_code.map(color => 
                    `<div class="color-band band-${color}"></div>`
                ).join('')}
            </div>
        `;
    }
    
    // Add code for capacitors
    if (component.type === 'capacitor' && component.capacitor_code) {
        codeHtml = `
            <div class="capacitor-code-display">
                <span class="capacitor-code-small">Code: ${component.capacitor_code}</span>
            </div>
        `;
    }
    
    card.innerHTML = `
        <div class="component-header">
            <span class="component-type type-${component.type}">${component.type}</span>
            <div>
                <button class="btn btn-sm btn-secondary" onclick="editComponent(${component.id})">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteComponent(${component.id})">🗑️</button>
            </div>
        </div>
        <h3 class="component-name">${component.name}</h3>
        ${component.value ? `<div class="component-value">${component.value}</div>` : ''}
        
        <div class="component-details">
            <span class="detail-item">📦 ${component.quantity} units</span>
            ${component.location ? `<span class="detail-item">📍 ${component.location}</span>` : ''}
        </div>
        
        ${codeHtml}
        
        ${component.notes ? `<div class="component-notes">${component.notes}</div>` : ''}
    `;
    
    return card;
}

// Search components
async function searchComponents() {
    const query = document.getElementById('searchInput').value;
    const type = document.getElementById('typeFilter').value;
    
    try {
        const response = await fetch(`/api/components/search?q=${query}&type=${type}`);
        const results = await response.json();
        displayComponents(results);
    } catch (error) {
        console.error('Error searching components:', error);
    }
}

// Show add component modal
function showAddComponent() {
    editingComponentId = null;
    document.getElementById('modalTitle').textContent = 'Add Component';
    document.getElementById('componentForm').reset();
    document.getElementById('componentId').value = '';
    updateSpecFields();
    document.getElementById('componentModal').style.display = 'block';
}

// Edit component
function editComponent(id) {
    const component = components.find(c => c.id === id);
    if (!component) return;
    
    editingComponentId = id;
    document.getElementById('modalTitle').textContent = 'Edit Component';
    document.getElementById('componentId').value = component.id;
    document.getElementById('componentType').value = component.type;
    document.getElementById('componentName').value = component.name;
    document.getElementById('componentValue').value = component.value || '';
    document.getElementById('componentQuantity').value = component.quantity;
    document.getElementById('componentLocation').value = component.location || '';
    document.getElementById('componentNotes').value = component.notes || '';
    
    updateSpecFields(component);
    document.getElementById('componentModal').style.display = 'block';
    
    // Trigger preview if editing
    if (component.type === 'resistor') {
        updateResistorPreview();
    } else if (component.type === 'capacitor') {
        updateCapacitorPreview();
    }
}

// Close modal
function closeModal() {
    document.getElementById('componentModal').style.display = 'none';
}

// Update spec fields based on component type
function updateSpecFields(component = {}) {
    const type = document.getElementById('componentType').value;
    const specFields = document.getElementById('specFields');
    specFields.innerHTML = '';
    
    if (type === 'resistor') {
        // Resistance value dropdown
        specFields.innerHTML += `
            <div class="form-group">
                <label>Resistance Value</label>
                <select id="resistance_value" class="spec-select" onchange="updateResistorPreview()">
                    <option value="">Select resistance...</option>
                    ${resistorValues.map(val => 
                        `<option value="${val}" ${component.value === val ? 'selected' : ''}>${val}</option>`
                    ).join('')}
                </select>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Tolerance</label>
                    <select id="tolerance">
                        <option value="">Select tolerance...</option>
                        ${resistorTolerances.map(tol => 
                            `<option value="${tol}" ${component.tolerance === tol ? 'selected' : ''}>${tol}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Power Rating</label>
                    <select id="wattage">
                        <option value="">Select wattage...</option>
                        ${resistorWattages.map(w => 
                            `<option value="${w}" ${component.wattage === w ? 'selected' : ''}>${w}</option>`
                        ).join('')}
                    </select>
                </div>
            </div>
            
            <div id="colorPreview" class="color-preview"></div>
        `;
    } else if (type === 'capacitor') {
        // Capacitance value dropdown
        specFields.innerHTML += `
            <div class="form-group">
                <label>Capacitance Value</label>
                <select id="capacitance_value" class="spec-select" onchange="updateCapacitorPreview()">
                    <option value="">Select capacitance...</option>
                    ${capacitorValues.map(val => 
                        `<option value="${val}" ${component.value === val ? 'selected' : ''}>${val}</option>`
                    ).join('')}
                </select>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Type</label>
                    <select id="capacitor_type">
                        <option value="">Select type...</option>
                        ${capacitorTypes.map(type => 
                            `<option value="${type.toLowerCase()}" ${component.capacitor_type === type.toLowerCase() ? 'selected' : ''}>${type}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Voltage Rating</label>
                    <select id="voltage_rating">
                        <option value="">Select voltage...</option>
                        ${capacitorVoltages.map(v => 
                            `<option value="${v}" ${component.voltage_rating === v ? 'selected' : ''}>${v}</option>`
                        ).join('')}
                    </select>
                </div>
            </div>
            
            <div id="capacitorPreview" class="capacitor-preview"></div>
        `;
    } else if (type === 'led') {
        specFields.innerHTML += `
            <div class="form-row">
                <div class="form-group">
                    <label>Color</label>
                    <select id="led_color">
                        <option value="">Select color...</option>
                        <option value="red">Red</option>
                        <option value="green">Green</option>
                        <option value="blue">Blue</option>
                        <option value="yellow">Yellow</option>
                        <option value="white">White</option>
                        <option value="orange">Orange</option>
                        <option value="uv">UV</option>
                        <option value="ir">IR</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Package</label>
                    <select id="led_package">
                        <option value="">Select package...</option>
                        <option value="3mm">3mm</option>
                        <option value="5mm">5mm</option>
                        <option value="smd">SMD</option>
                        <option value="high-power">High Power</option>
                    </select>
                </div>
            </div>
        `;
    } else if (type === 'ic') {
        specFields.innerHTML += `
            <div class="form-row">
                <div class="form-group">
                    <label>Package Type</label>
                    <select id="package_type">
                        <option value="">Select package...</option>
                        <option value="DIP">DIP</option>
                        <option value="SMD">SMD</option>
                        <option value="QFP">QFP</option>
                        <option value="BGA">BGA</option>
                        <option value="SOP">SOP</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Pin Count</label>
                    <input type="number" id="pin_count" min="0" value="${component.pin_count || ''}">
                </div>
            </div>
        `;
    }
    
    // Update the main value field automatically
    if (type === 'resistor' && component.value) {
        document.getElementById('componentValue').value = component.value;
    } else if (type === 'capacitor' && component.value) {
        document.getElementById('componentValue').value = component.value;
    }
}

// Live preview of resistor color code
function updateResistorPreview() {
    const value = document.getElementById('resistance_value').value;
    if (!value) return;
    
    // Update the main value field
    document.getElementById('componentValue').value = value;
    
    // Parse the value to ohms
    const resistance = parseResistanceToOhms(value);
    if (!resistance) return;
    
    // Calculate color code
    const colors = calculateResistorColors(resistance);
    
    // Show preview
    const preview = document.getElementById('colorPreview');
    if (preview) {
        preview.innerHTML = `
            <div class="color-code">
                ${colors.map(color => 
                    `<div class="color-band band-${color}"></div>`
                ).join('')}
            </div>
            <p class="preview-text">${value} resistor (${resistance}Ω)</p>
        `;
    }
}

// Live preview of capacitor code
function updateCapacitorPreview() {
    const value = document.getElementById('capacitance_value').value;
    if (!value) return;
    
    // Update the main value field
    document.getElementById('componentValue').value = value;
    
    // Calculate capacitor code
    const code = calculateCapacitorCode(value);
    
    // Show preview
    const preview = document.getElementById('capacitorPreview');
    if (preview) {
        preview.innerHTML = `
            <div class="capacitor-code-display">
                <span class="capacitor-code">${code}</span>
            </div>
            <p class="preview-text">${value} capacitor (Code: ${code})</p>
        `;
    }
}

// Helper: Parse resistance string to ohms
function parseResistanceToOhms(valueStr) {
    const match = valueStr.match(/([\d.]+)\s*([kKmM]?)Ω?/);
    if (!match) return null;
    
    const value = parseFloat(match[1]);
    const multiplier = match[2].toLowerCase();
    
    if (multiplier === 'k') return value * 1000;
    if (multiplier === 'm') return value * 1000000;
    return value;
}

// Helper: Calculate resistor color codes
function calculateResistorColors(resistance) {
    const colorMap = {
        0: 'black', 1: 'brown', 2: 'red', 3: 'orange', 4: 'yellow',
        5: 'green', 6: 'blue', 7: 'violet', 8: 'gray', 9: 'white'
    };
    
    let firstDigit, secondDigit, multiplier;
    
    if (resistance >= 100) {
        const str = resistance.toString();
        firstDigit = parseInt(str[0]);
        secondDigit = parseInt(str[1] || '0');
        multiplier = str.length - 2;
    } else if (resistance >= 10) {
        firstDigit = Math.floor(resistance / 10);
        secondDigit = Math.floor(resistance % 10);
        multiplier = 0;
    } else {
        firstDigit = Math.floor(resistance);
        secondDigit = Math.floor((resistance * 10) % 10);
        multiplier = -1;
    }
    
    const multiplierColors = {
        '-1': 'gold', '0': 'black', '1': 'brown', '2': 'red',
        '3': 'orange', '4': 'yellow', '5': 'green', '6': 'blue',
        '7': 'violet', '8': 'gray', '9': 'white'
    };
    
    return [
        colorMap[firstDigit],
        colorMap[secondDigit],
        multiplierColors[multiplier.toString()],
        'gold' // tolerance (5%)
    ];
}

// Helper: Calculate capacitor code
function calculateCapacitorCode(valueStr) {
    const match = valueStr.match(/([\d.]+)\s*(pF|nF|µF|uF|mF|F)/i);
    if (!match) return '';
    
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    
    // Convert to picofarads
    let pf;
    if (unit === 'pf') pf = value;
    else if (unit === 'nf') pf = value * 1000;
    else if (unit === 'µf' || unit === 'uf') pf = value * 1000000;
    else if (unit === 'mf') pf = value * 1000000000;
    else if (unit === 'f') pf = value * 1000000000000;
    
    if (pf < 10) {
        return `${pf.toFixed(1)}pF`;
    } else if (pf < 100) {
        return `${Math.round(pf)}pF`;
    } else if (pf < 1000) {
        return `${Math.round(pf)}`;
    } else {
        // Generate 3-digit code
        const str = Math.round(pf).toString();
        const firstTwo = str.substring(0, 2);
        const multiplier = str.length - 1;
        return `${firstTwo}${multiplier}`;
    }
}

// Handle component form submission
document.getElementById('componentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const type = document.getElementById('componentType').value;
    const componentData = {
        type: type,
        name: document.getElementById('componentName').value,
        value: document.getElementById('componentValue').value,
        quantity: parseInt(document.getElementById('componentQuantity').value) || 0,
        location: document.getElementById('componentLocation').value,
        notes: document.getElementById('componentNotes').value
    };
    
    // Add type-specific fields
    if (type === 'resistor') {
        const resistanceSelect = document.getElementById('resistance_value');
        const toleranceSelect = document.getElementById('tolerance');
        const wattageSelect = document.getElementById('wattage');
        
        if (resistanceSelect && resistanceSelect.value) {
            componentData.value = resistanceSelect.value;
            // Convert to ohms for backend
            componentData.resistance_value = parseResistanceToOhms(resistanceSelect.value);
        }
        if (toleranceSelect) componentData.tolerance = toleranceSelect.value;
        if (wattageSelect) componentData.wattage = wattageSelect.value;
    } else if (type === 'capacitor') {
        const capacitanceSelect = document.getElementById('capacitance_value');
        const typeSelect = document.getElementById('capacitor_type');
        const voltageSelect = document.getElementById('voltage_rating');
        
        if (capacitanceSelect && capacitanceSelect.value) {
            componentData.value = capacitanceSelect.value;
        }
        if (typeSelect) componentData.capacitor_type = typeSelect.value;
        if (voltageSelect) componentData.voltage_rating = voltageSelect.value;
    } else if (type === 'ic') {
        const packageSelect = document.getElementById('package_type');
        const pinInput = document.getElementById('pin_count');
        
        if (packageSelect) componentData.package_type = packageSelect.value;
        if (pinInput) componentData.pin_count = parseInt(pinInput.value) || null;
    }
    
    try {
        let response;
        if (editingComponentId) {
            response = await fetch(`/api/components/${editingComponentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(componentData)
            });
        } else {
            response = await fetch('/api/components', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(componentData)
            });
        }
        
        if (response.ok) {
            closeModal();
            loadComponents();
        }
    } catch (error) {
        console.error('Error saving component:', error);
        alert('Error saving component. Please try again.');
    }
});

// Delete component
async function deleteComponent(id) {
    if (!confirm('Are you sure you want to delete this component?')) return;
    
    try {
        await fetch(`/api/components/${id}`, { method: 'DELETE' });
        loadComponents();
    } catch (error) {
        console.error('Error deleting component:', error);
    }
}

// Load projects
async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        projects = await response.json();
        displayProjects(projects);
        updateDashboard();
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

// Display projects
function displayProjects(projectsList) {
    const grid = document.getElementById('projectsGrid');
    grid.innerHTML = '';
    
    projectsList.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-card';
        
        const statusClass = project.status.toLowerCase().replace(' ', '-');
        
        card.innerHTML = `
            <div class="project-header">
                <h3 class="project-name">${project.name}</h3>
                <span class="project-status status-${statusClass}">${project.status}</span>
            </div>
            ${project.description ? `<p>${project.description}</p>` : ''}
            <div class="project-components-list">
                ${project.components.map(pc => 
                    `<span class="project-component-tag">${pc.component_name} (${pc.quantity_needed})</span>`
                ).join('')}
            </div>
            <div style="margin-top: 15px; display: flex; gap: 8px;">
                <button class="btn btn-sm btn-secondary" onclick="editProject(${project.id})">✏️ Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteProject(${project.id})">🗑️ Delete</button>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

// Show add project modal
function showAddProject() {
    editingProjectId = null;
    document.getElementById('projectModalTitle').textContent = 'New Project';
    document.getElementById('projectForm').reset();
    document.getElementById('projectId').value = '';
    document.getElementById('projectComponents').innerHTML = '';
    document.getElementById('projectModal').style.display = 'block';
}

// Edit project
function editProject(id) {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    
    editingProjectId = id;
    document.getElementById('projectModalTitle').textContent = 'Edit Project';
    document.getElementById('projectId').value = project.id;
    document.getElementById('projectName').value = project.name;
    document.getElementById('projectDescription').value = project.description || '';
    document.getElementById('projectStatus').value = project.status;
    
    // Clear and repopulate components
    const container = document.getElementById('projectComponents');
    container.innerHTML = '';
    project.components.forEach(pc => {
        addProjectComponentRow(pc.component_id, pc.quantity_needed);
    });
    
    document.getElementById('projectModal').style.display = 'block';
}

// Close project modal
function closeProjectModal() {
    document.getElementById('projectModal').style.display = 'none';
}

// Add component row to project
function addComponentToProject() {
    addProjectComponentRow();
}

function addProjectComponentRow(componentId = null, quantity = 1) {
    const container = document.getElementById('projectComponents');
    const row = document.createElement('div');
    row.className = 'project-component-item';
    
    row.innerHTML = `
        <select class="component-select">
            <option value="">Select component...</option>
            ${components.map(c => 
                `<option value="${c.id}" ${componentId === c.id ? 'selected' : ''}>
                    ${c.name} - ${c.value || 'No value'}
                </option>`
            ).join('')}
        </select>
        <input type="number" class="quantity-input" min="1" value="${quantity}" placeholder="Qty">
        <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">✕</button>
    `;
    
    container.appendChild(row);
}

// Handle project form submission
document.getElementById('projectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const projectComponents = [];
    document.querySelectorAll('.project-component-item').forEach(row => {
        const componentId = row.querySelector('.component-select').value;
        const quantity = row.querySelector('.quantity-input').value;
        
        if (componentId) {
            projectComponents.push({
                component_id: parseInt(componentId),
                quantity_needed: parseInt(quantity) || 1
            });
        }
    });
    
    const projectData = {
        name: document.getElementById('projectName').value,
        description: document.getElementById('projectDescription').value,
        status: document.getElementById('projectStatus').value,
        components: projectComponents
    };
    
    try {
        let response;
        if (editingProjectId) {
            response = await fetch(`/api/projects/${editingProjectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectData)
            });
        } else {
            response = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectData)
            });
        }
        
        if (response.ok) {
            closeProjectModal();
            loadProjects();
        }
    } catch (error) {
        console.error('Error saving project:', error);
        alert('Error saving project. Please try again.');
    }
});

// Delete project
async function deleteProject(id) {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    try {
        await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        loadProjects();
    } catch (error) {
        console.error('Error deleting project:', error);
    }
}

// Update dashboard
function updateDashboard() {
    document.getElementById('totalComponents').textContent = components.length;
    document.getElementById('lowStock').textContent = components.filter(c => c.quantity < 5).length;
    document.getElementById('totalProjects').textContent = projects.length;
    
    const categories = new Set(components.map(c => c.type));
    document.getElementById('totalCategories').textContent = categories.size;
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/current_user');
        if (response.ok) {
            const user = await response.json();
            document.getElementById('userInfo').textContent = `👤 ${user.username}`;
        } else {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login';
    }
});

// Logout function
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login';
    } catch (error) {
        console.error('Logout failed:', error);
    }
}