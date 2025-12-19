import { db } from './firebase-config.js';
import { ref, push, onValue, remove, update } from 'firebase/database';
import jsPDF from 'https://esm.sh/jspdf@2.5.1';

const form = document.getElementById('military-form');
const keyInput = document.getElementById('key');
const postoGdInput = document.getElementById('posto_gd');
const reInput = document.getElementById('re');
const nomeGuerraInput = document.getElementById('nome_guerra');
const opmInput = document.getElementById('opm');
const sexoInput = document.getElementById('sexo');
const militaryList = document.getElementById('military-list');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const searchInput = document.getElementById('search-input'); // New
const romaneioModal = document.getElementById('romaneio-modal');
const reportModal = document.getElementById('report-modal');
const romaneioForm = document.getElementById('romaneio-form');
const reportBtn = document.getElementById('report-btn');
const reportContent = document.getElementById('report-content');
const pdfBtn = document.getElementById('pdf-btn');
const pdfOptionsModal = document.getElementById('pdf-options-modal');
const pdfNormalBtn = document.getElementById('pdf-normal-btn');
const pdfDetailedBtn = document.getElementById('pdf-detailed-btn');

let allMilitares = []; // Store the full list of military personnel

// Reference to the 'militares' node in the database
const militaryRef = ref(db, 'militares');

// --- Populate Romaneio Select Options ---
function populateRomaneioSelects() {
    // Camisa, Calça, Jaqueta: 36-68 (even numbers only)
    const evenSizes = [];
    for (let i = 36; i <= 68; i += 2) {
        evenSizes.push(i);
    }
    
    const camisaSelect = document.getElementById('camisa');
    const calcaSelect = document.getElementById('calca');
    const jaquetaSelect = document.getElementById('jaqueta');
    
    evenSizes.forEach(size => {
        camisaSelect.innerHTML += `<option value="${size}">${size}</option>`;
        calcaSelect.innerHTML += `<option value="${size}">${size}</option>`;
        jaquetaSelect.innerHTML += `<option value="${size}">${size}</option>`;
    });
    
    // Coturno: 33-48
    const coturnoSelect = document.getElementById('coturno');
    for (let i = 33; i <= 48; i++) {
        coturnoSelect.innerHTML += `<option value="${i}">${i}</option>`;
    }
    
    // Boina: 54-62
    const boinaSelect = document.getElementById('boina');
    for (let i = 54; i <= 62; i++) {
        boinaSelect.innerHTML += `<option value="${i}">${i}</option>`;
    }
}

// Initialize romaneio selects
populateRomaneioSelects();

// --- C R E A T E / U P D A T E Handler ---
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const key = keyInput.value;
    const posto_gd = postoGdInput.value.trim().toUpperCase();
    const re = reInput.value.trim();
    const nome_guerra = nomeGuerraInput.value.trim().toUpperCase();
    const opm = opmInput.value.trim().toUpperCase();

    // RE validation: exactly 6 digits
    if (!/^\d{6}$/.test(re)) {
        alert('Erro: O campo RE deve conter exatamente 6 números.');
        reInput.focus();
        return;
    }

    // Check for duplicate RE (skip if editing the same record)
    const duplicateRE = allMilitares.find(m => m.re === re && m.key !== key);
    if (duplicateRE) {
        alert(`Erro: O RE ${re} já está cadastrado para ${duplicateRE.posto_gd} ${duplicateRE.nome_guerra}.`);
        reInput.focus();
        return;
    }

    const militaryData = {
        posto_gd,
        re,
        nome_guerra,
        opm,
        sexo: sexoInput.value.trim()
    };

    try {
        if (key) {
            // Update (U)
            const itemRef = ref(db, `militares/${key}`);
            update(itemRef, militaryData)
                .then(() => {
                    console.log("Militar atualizado com sucesso!");
                    resetForm();
                })
                .catch(error => {
                    alert("Erro ao atualizar: " + error.message);
                });
        } else {
            // Create (C)
            push(militaryRef, militaryData)
                .then(() => {
                    console.log("Militar cadastrado com sucesso!");
                    resetForm();
                })
                .catch(error => {
                    alert("Erro ao salvar: " + error.message);
                });
        }
    } catch (error) {
        console.error("Erro na submissão:", error);
    }
});

// --- R E A D Listener ---
function loadMilitares() {
    onValue(militaryRef, (snapshot) => {
        militaryList.innerHTML = '';
        const data = snapshot.val();
        
        if (data) {
            // Convert object into array of [key, value] pairs and include key
            let items = Object.entries(data).map(([key, value]) => ({ key, ...value }));
            
            // Store the full dataset and sort by RE for consistency
            items.sort((a, b) => a.re.localeCompare(b.re));
            allMilitares = items;

            // Display filtered list (or all if search is empty)
            filterMilitares(searchInput.value.trim());

        } else {
            allMilitares = [];
            militaryList.innerHTML = '<li class="loading">Nenhum militar cadastrado ainda.</li>';
        }
    }, (error) => {
        console.error("Erro ao carregar dados:", error);
        militaryList.innerHTML = `<li class="loading" style="color: var(--danger-color);">Erro ao carregar dados: ${error.message}</li>`;
    });
}

// --- F I L T E R / S E A R C H ---
function filterMilitares(searchTerm) {
    militaryList.innerHTML = '';
    const query = searchTerm.toLowerCase();

    let filteredItems;
    
    if (query === '') {
        // Show only last 2 militares when no search term
        filteredItems = allMilitares.slice(-2);
    } else {
        // Filter based on search term
        filteredItems = allMilitares.filter(item => {
            return item.re.includes(query) || 
                   item.posto_gd.toLowerCase().includes(query) || 
                   item.nome_guerra.toLowerCase().includes(query);
        });
    }

    if (filteredItems.length > 0) {
        filteredItems.forEach(military => {
            // military object contains key, posto_gd, re, etc.
            const li = createListItem(military.key, military);
            militaryList.appendChild(li);
        });
    } else {
        militaryList.innerHTML = '<li class="loading">Nenhum resultado encontrado.</li>';
    }
}

// Attach Search Listener
searchInput.addEventListener('input', (e) => {
    filterMilitares(e.target.value);
});


function createListItem(key, military) {
    const li = document.createElement('li');
    const hasRomaneio = military.romaneio ? '<span class="romaneio-status">✓</span>' : '';
    li.innerHTML = `
        <div class="military-details">
            <p><strong>RE:</strong> ${military.re}${hasRomaneio}</p>
            <p><strong>Posto/GD:</strong> ${military.posto_gd}</p>
            <p><strong>Nome Guerra:</strong> ${military.nome_guerra}</p>
            <p><strong>Sexo:</strong> ${military.sexo || 'N/A'}</p>
            <p><strong>OPM:</strong> ${military.opm}</p>
        </div>
        <div class="military-actions">
            <button class="romaneio-btn" data-key="${key}">Romaneio</button>
            <button class="edit-btn" data-key="${key}">Editar</button>
            <button class="delete-btn" data-key="${key}">Excluir</button>
        </div>
    `;

    // Attach Edit and Delete listeners
    li.querySelector('.romaneio-btn').addEventListener('click', () => openRomaneio(key, military));
    li.querySelector('.edit-btn').addEventListener('click', () => editMilitary(key, military));
    li.querySelector('.delete-btn').addEventListener('click', () => deleteMilitary(key, military.re));
    
    return li;
}

// --- Open Romaneio Modal ---
function openRomaneio(key, military) {
    document.getElementById('romaneio-key').value = key;
    document.getElementById('modal-name').textContent = `${military.posto_gd} ${military.nome_guerra} (RE: ${military.re})`;
    
    // If romaneio data exists, populate the form
    if (military.romaneio) {
        document.getElementById('camisa').value = military.romaneio.camisa || '';
        document.getElementById('calca').value = military.romaneio.calca || '';
        document.getElementById('camiseta').value = military.romaneio.camiseta || '';
        document.getElementById('jaqueta').value = military.romaneio.jaqueta || '';
        document.getElementById('coturno').value = military.romaneio.coturno || '';
        document.getElementById('boina').value = military.romaneio.boina || '';
        document.getElementById('distintivo').value = military.romaneio.distintivo || '';
        document.getElementById('cinto').value = military.romaneio.cinto || '';
    } else {
        romaneioForm.reset();
    }
    
    romaneioModal.style.display = 'block';
}

// --- Save Romaneio ---
romaneioForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const key = document.getElementById('romaneio-key').value;
    const romaneioData = {
        camisa: document.getElementById('camisa').value,
        calca: document.getElementById('calca').value,
        camiseta: document.getElementById('camiseta').value,
        jaqueta: document.getElementById('jaqueta').value,
        coturno: document.getElementById('coturno').value,
        boina: document.getElementById('boina').value,
        distintivo: document.getElementById('distintivo').value,
        cinto: document.getElementById('cinto').value
    };
    
    const itemRef = ref(db, `militares/${key}/romaneio`);
    update(itemRef, romaneioData)
        .then(() => {
            console.log("Romaneio salvo com sucesso!");
            romaneioModal.style.display = 'none';
            romaneioForm.reset();
        })
        .catch(error => {
            alert("Erro ao salvar romaneio: " + error.message);
        });
});

// --- Generate Report ---
reportBtn.addEventListener('click', () => {
    const militaresComRomaneio = allMilitares.filter(m => m.romaneio);
    
    if (militaresComRomaneio.length === 0) {
        reportContent.innerHTML = '<p class="loading">Nenhum romaneio cadastrado ainda.</p>';
    } else {
        // Aggregate data
        const totals = {
            camisa: {},
            calca: {},
            camiseta: {},
            jaqueta: {},
            coturno: {},
            boina: {},
            distintivo: {},
            cinto: {}
        };
        
        militaresComRomaneio.forEach(m => {
            const r = m.romaneio;
            totals.camisa[r.camisa] = (totals.camisa[r.camisa] || 0) + 1;
            
            // Track gender for calça
            if (!totals.calca[r.calca]) totals.calca[r.calca] = { Masculino: 0, Feminino: 0 };
            totals.calca[r.calca][m.sexo] = (totals.calca[r.calca][m.sexo] || 0) + 1;
            
            totals.camiseta[r.camiseta] = (totals.camiseta[r.camiseta] || 0) + 1;
            totals.jaqueta[r.jaqueta] = (totals.jaqueta[r.jaqueta] || 0) + 1;
            totals.coturno[r.coturno] = (totals.coturno[r.coturno] || 0) + 1;
            totals.boina[r.boina] = (totals.boina[r.boina] || 0) + 1;
            totals.distintivo[r.distintivo] = (totals.distintivo[r.distintivo] || 0) + 1;
            totals.cinto[r.cinto] = (totals.cinto[r.cinto] || 0) + 1;
        });
        
        let html = `<p><strong>Total de militares com romaneio:</strong> ${militaresComRomaneio.length}</p>`;
        
        const sections = [
            { title: 'Camisa Operacional', data: totals.camisa },
            { title: 'Calça Operacional', data: totals.calca, showGender: true },
            { title: 'Camiseta Cinza', data: totals.camiseta },
            { title: 'Jaqueta Operacional', data: totals.jaqueta },
            { title: 'Coturno', data: totals.coturno },
            { title: 'Boina', data: totals.boina },
            { title: 'Distintivo Boina', data: totals.distintivo },
            { title: 'Cinto Lona', data: totals.cinto }
        ];
        
        sections.forEach(section => {
            html += `<div class="report-section">
                <h3>${section.title}</h3>`;
            
            const sorted = Object.entries(section.data).sort((a, b) => {
                // Try to sort numerically if possible, otherwise alphabetically
                const aNum = parseFloat(a[0]);
                const bNum = parseFloat(b[0]);
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return aNum - bNum;
                }
                return a[0].localeCompare(b[0]);
            });
            
            sorted.forEach(([size, count]) => {
                if (section.showGender) {
                    // Show gender breakdown for calça
                    const masc = count.Masculino || 0;
                    const fem = count.Feminino || 0;
                    const total = masc + fem;
                    html += `<div class="report-item">
                        <span>Tamanho ${size}</span>
                        <span><strong>${total}</strong> (M: ${masc}, F: ${fem})</span>
                    </div>`;
                } else {
                    html += `<div class="report-item">
                        <span>Tamanho ${size}</span>
                        <span><strong>${count}</strong></span>
                    </div>`;
                }
            });
            
            html += `</div>`;
        });
        
        reportContent.innerHTML = html;
    }
    
    reportModal.style.display = 'block';
});

// --- Open PDF Options Modal ---
pdfBtn.addEventListener('click', () => {
    const militaresComRomaneio = allMilitares.filter(m => m.romaneio);
    
    if (militaresComRomaneio.length === 0) {
        alert('Nenhum romaneio cadastrado ainda.');
        return;
    }
    
    pdfOptionsModal.style.display = 'block';
});

// --- Generate Normal PDF Report ---
pdfNormalBtn.addEventListener('click', () => {
    const militaresComRomaneio = allMilitares.filter(m => m.romaneio);
    
    // Aggregate data
    const totals = {
        camisa: {},
        calca: {},
        camiseta: {},
        jaqueta: {},
        coturno: {},
        boina: {},
        distintivo: {},
        cinto: {}
    };
    
    militaresComRomaneio.forEach(m => {
        const r = m.romaneio;
        totals.camisa[r.camisa] = (totals.camisa[r.camisa] || 0) + 1;
        
        // Track gender for calça
        if (!totals.calca[r.calca]) totals.calca[r.calca] = { Masculino: 0, Feminino: 0 };
        totals.calca[r.calca][m.sexo] = (totals.calca[r.calca][m.sexo] || 0) + 1;
        
        totals.camiseta[r.camiseta] = (totals.camiseta[r.camiseta] || 0) + 1;
        totals.jaqueta[r.jaqueta] = (totals.jaqueta[r.jaqueta] || 0) + 1;
        totals.coturno[r.coturno] = (totals.coturno[r.coturno] || 0) + 1;
        totals.boina[r.boina] = (totals.boina[r.boina] || 0) + 1;
        totals.distintivo[r.distintivo] = (totals.distintivo[r.distintivo] || 0) + 1;
        totals.cinto[r.cinto] = (totals.cinto[r.cinto] || 0) + 1;
    });
    
    // Create PDF
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Relatório de Romaneio - Normal', 105, 15, { align: 'center' });
    
    // Total
    doc.setFontSize(12);
    doc.text(`Total de militares: ${militaresComRomaneio.length}`, 20, 30);
    
    let yPos = 45;
    
    const sections = [
        { title: 'Camisa Operacional', data: totals.camisa },
        { title: 'Calça Operacional', data: totals.calca, showGender: true },
        { title: 'Camiseta Cinza', data: totals.camiseta },
        { title: 'Jaqueta Operacional', data: totals.jaqueta },
        { title: 'Coturno', data: totals.coturno },
        { title: 'Boina', data: totals.boina },
        { title: 'Distintivo Boina', data: totals.distintivo },
        { title: 'Cinto Lona', data: totals.cinto }
    ];
    
    sections.forEach(section => {
        // Check if we need a new page
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }
        
        // Section title
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(section.title, 20, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        const sorted = Object.entries(section.data).sort((a, b) => {
            const aNum = parseFloat(a[0]);
            const bNum = parseFloat(b[0]);
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return aNum - bNum;
            }
            return a[0].localeCompare(b[0]);
        });
        
        sorted.forEach(([size, count]) => {
            if (section.showGender) {
                // Show gender breakdown for calça
                const masc = count.Masculino || 0;
                const fem = count.Feminino || 0;
                const total = masc + fem;
                doc.text(`  Tamanho ${size}: ${total} (M: ${masc}, F: ${fem})`, 20, yPos);
            } else {
                doc.text(`  Tamanho ${size}: ${count}`, 20, yPos);
            }
            yPos += 6;
        });
        
        yPos += 5;
    });
    
    // Save PDF
    doc.save('relatorio-romaneio-normal.pdf');
    pdfOptionsModal.style.display = 'none';
});

// --- Generate Detailed PDF Report ---
pdfDetailedBtn.addEventListener('click', () => {
    const militaresComRomaneio = allMilitares.filter(m => m.romaneio);
    
    // Sort by RE
    militaresComRomaneio.sort((a, b) => a.re.localeCompare(b.re));
    
    // Create PDF
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Relatório de Romaneio - Detalhado', 105, 15, { align: 'center' });
    
    // Total
    doc.setFontSize(12);
    doc.text(`Total de militares: ${militaresComRomaneio.length}`, 20, 30);
    
    let yPos = 45;
    
    militaresComRomaneio.forEach((militar, index) => {
        // Check if we need a new page
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }
        
        // Military header
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`${index + 1}. ${militar.posto_gd} ${militar.nome_guerra} - RE: ${militar.re}`, 20, yPos);
        yPos += 7;
        
        // Romaneio details
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        const r = militar.romaneio;
        
        doc.text(`  Camisa Operacional: ${r.camisa}`, 25, yPos);
        yPos += 5;
        doc.text(`  Calça Operacional: ${r.calca} (${militar.sexo})`, 25, yPos);
        yPos += 5;
        doc.text(`  Camiseta Cinza: ${r.camiseta}`, 25, yPos);
        yPos += 5;
        doc.text(`  Jaqueta Operacional: ${r.jaqueta}`, 25, yPos);
        yPos += 5;
        doc.text(`  Coturno: ${r.coturno}`, 25, yPos);
        yPos += 5;
        doc.text(`  Boina: ${r.boina}`, 25, yPos);
        yPos += 5;
        doc.text(`  Distintivo Boina: ${r.distintivo}`, 25, yPos);
        yPos += 5;
        doc.text(`  Cinto Lona: ${r.cinto}`, 25, yPos);
        yPos += 8;
    });
    
    // Save PDF
    doc.save('relatorio-romaneio-detalhado.pdf');
    pdfOptionsModal.style.display = 'none';
});

// --- Modal Close Handlers ---
const closeButtons = document.querySelectorAll('.close');
closeButtons.forEach(btn => {
    btn.addEventListener('click', function() {
        this.closest('.modal').style.display = 'none';
    });
});

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// --- E D I T (Populate form) ---
function editMilitary(key, data) {
    keyInput.value = key;
    postoGdInput.value = data.posto_gd;
    reInput.value = data.re;
    nomeGuerraInput.value = data.nome_guerra;
    opmInput.value = data.opm;
    sexoInput.value = data.sexo || '';

    submitBtn.textContent = 'Atualizar';
    cancelBtn.style.display = 'inline-block';
    
    // Scroll to the form for better mobile UX
    window.scrollTo({ top: 0, behavior: 'smooth' });
    postoGdInput.focus();
}

// --- Form Reset Functionality ---
cancelBtn.addEventListener('click', resetForm);

function resetForm() {
    form.reset();
    keyInput.value = '';
    opmInput.value = 'Copom SP'; // Restore default OPM
    submitBtn.textContent = 'Salvar';
    cancelBtn.style.display = 'none';
}

// --- D E L E T E ---
function deleteMilitary(key, reValue) {
    if (confirm(`Tem certeza que deseja excluir o militar RE ${reValue} ?`)) {
        const itemRef = ref(db, `militares/${key}`);
        remove(itemRef)
            .then(() => {
                console.log("Militar excluído!");
                // If the deleted item was currently being edited, reset the form
                if (keyInput.value === key) {
                    resetForm();
                }
            })
            .catch(error => {
                alert("Erro ao excluir: " + error.message);
            });
    }
}

// Auto-uppercase text inputs
[nomeGuerraInput, opmInput].forEach(input => {
    input.addEventListener('input', (e) => {
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        e.target.value = e.target.value.toUpperCase();
        e.target.setSelectionRange(start, end);
    });
});

// Initialize application
loadMilitares();

// --- DARK MODE TOGGLE ---
const darkModeToggle = document.getElementById('dark-mode-toggle');

// Check for saved dark mode preference
const isDarkMode = localStorage.getItem('darkMode') === 'true';
if (isDarkMode) {
    document.body.classList.add('dark-mode');
    darkModeToggle.textContent = '☀️';
}

darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    darkModeToggle.textContent = isDark ? '☀️' : '🌙';
});

