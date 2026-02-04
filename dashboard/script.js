const API_URL = 'https://api.escuelajs.co/api/v1/products';

// State (Trạng thái) của ứng dụng
let allProducts = [];       // Tất cả dữ liệu từ API
let displayedProducts = []; // Dữ liệu đang hiển thị (sau khi search/sort)
let currentPage = 1;
let pageSize = 10;
let sortConfig = { key: null, direction: 'asc' }; // Cấu hình sắp xếp
let modalInstance = null; // Biến giữ đối tượng Bootstrap Modal

// Khởi tạo ứng dụng
document.addEventListener('DOMContentLoaded', () => {
    modalInstance = new bootstrap.Modal(document.getElementById('productModal'));
    fetchProducts();
    
    // Sự kiện tìm kiếm (onChanged)
    document.getElementById('searchInput').addEventListener('input', handleSearch);
});

// --- 1. CALL API ---
async function fetchProducts() {
    try {
        // Lấy dữ liệu từ API
        const response = await fetch(API_URL);
        const data = await response.json();
        
        // Gán dữ liệu
        allProducts = data;
        displayedProducts = [...allProducts]; // Copy mảng
        
        renderTable();
        renderPagination();
    } catch (error) {
        console.error('Lỗi khi tải dữ liệu:', error);
        Swal.fire('Lỗi', 'Không thể tải dữ liệu từ API', 'error');
    }
}

// --- 2. RENDER TABLE ---
function renderTable() {
    const tbody = document.getElementById('productTableBody');
    tbody.innerHTML = '';

    // Tính toán phân trang
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = displayedProducts.slice(start, end);

    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Không tìm thấy dữ liệu</td></tr>';
        return;
    }

    pageData.forEach(product => {
        // Xử lý ảnh (API này đôi khi trả về chuỗi JSON lỗi trong mảng ảnh)
        let imgUrl = 'https://via.placeholder.com/60';
        if (product.images && product.images.length > 0) {
            // Làm sạch url vì API này hay có ký tự lạ ["..."]
            let rawUrl = product.images[0];
            imgUrl = rawUrl.replace(/[\[\]"]/g, ''); 
        }

        const tr = document.createElement('tr');
        // Set title attribute để hiển thị description khi hover
        tr.setAttribute('title', product.description || 'No description');
        tr.onclick = (e) => {
            // Ngăn sự kiện click nếu đang bôi đen text
            if(window.getSelection().toString().length === 0) {
                openViewModal(product.id); 
            }
        };

        tr.innerHTML = `
            <td>${product.id}</td>
            <td>${product.title}</td>
            <td class="fw-bold text-success">$${product.price}</td>
            <td>${product.category ? product.category.name : 'N/A'}</td>
            <td><img src="${imgUrl}" class="product-img" onerror="this.src='https://via.placeholder.com/60'"></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- 3. PAGINATION ---
function renderPagination() {
    const totalPages = Math.ceil(displayedProducts.length / pageSize);
    const paginationEl = document.getElementById('pagination');
    paginationEl.innerHTML = '';

    // Nút Previous
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Trước</a>`;
    paginationEl.appendChild(prevLi);

    // Hiển thị tối đa 5 trang gần nhất để không bị dài quá
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" onclick="changePage(${i})">${i}</a>`;
        paginationEl.appendChild(li);
    }

    // Nút Next
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Sau</a>`;
    paginationEl.appendChild(nextLi);
}

function changePage(page) {
    const totalPages = Math.ceil(displayedProducts.length / pageSize);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable();
    renderPagination();
}

function changePageSize() {
    pageSize = parseInt(document.getElementById('pageSizeSelect').value);
    currentPage = 1; // Reset về trang 1
    renderTable();
    renderPagination();
}

// --- 4. SEARCH ---
function handleSearch(e) {
    const keyword = e.target.value.toLowerCase();
    
    if (!keyword) {
        displayedProducts = [...allProducts];
    } else {
        displayedProducts = allProducts.filter(p => 
            p.title.toLowerCase().includes(keyword)
        );
    }
    
    // Áp dụng lại sort nếu có
    if (sortConfig.key) {
        sortData(sortConfig.key, sortConfig.direction);
    }

    currentPage = 1;
    renderTable();
    renderPagination();
}

// --- 5. SORTING ---
function handleSort(key) {
    // Đảo ngược hướng nếu click lại cột cũ
    if (sortConfig.key === key) {
        sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortConfig.key = key;
        sortConfig.direction = 'asc';
    }

    sortData(key, sortConfig.direction);
    renderTable();
}

function sortData(key, direction) {
    displayedProducts.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];

        // Nếu là chữ thì so sánh locale
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

// --- 6. EXPORT CSV ---
function exportToCSV() {
    // Lấy dữ liệu hiện tại (đã lọc/sắp xếp)
    // Lưu ý: Export toàn bộ dữ liệu khớp với search, chứ không chỉ trang hiện tại
    
    const headers = ['ID', 'Title', 'Price', 'Category', 'Description'];
    
    // Map dữ liệu sang mảng chuỗi
    const rows = displayedProducts.map(p => [
        p.id,
        `"${p.title.replace(/"/g, '""')}"`, // Escape dấu ngoặc kép
        p.price,
        `"${p.category ? p.category.name : ''}"`,
        `"${p.description.replace(/"/g, '""')}"`
    ]);

    // Gộp header và rows
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    // Tạo file blob và tải xuống
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'products_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- 7. MODAL LOGIC (CREATE / VIEW / EDIT) ---

// Mở modal tạo mới
function openCreateModal() {
    document.getElementById('modalTitle').innerText = 'Tạo Sản Phẩm Mới';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    
    // Bật chế độ edit, ẩn nút edit, hiện nút save
    setFormEditable(true);
    document.getElementById('btnEdit').classList.add('d-none');
    document.getElementById('btnSave').classList.remove('d-none');
    
    modalInstance.show();
}

// Mở modal xem chi tiết
function openViewModal(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    document.getElementById('modalTitle').innerText = 'Chi Tiết Sản Phẩm';
    document.getElementById('productId').value = product.id;
    document.getElementById('productTitle').value = product.title;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productDescription').value = product.description;
    document.getElementById('productCategoryId').value = product.category ? product.category.id : 1;
    document.getElementById('productImage').value = product.images[0] || '';

    // Tắt chế độ edit, hiện nút edit, ẩn nút save
    setFormEditable(false);
    document.getElementById('btnEdit').classList.remove('d-none');
    document.getElementById('btnSave').classList.add('d-none');

    modalInstance.show();
}

// Chuyển sang chế độ edit
function enableEditMode() {
    document.getElementById('modalTitle').innerText = 'Cập Nhật Sản Phẩm';
    setFormEditable(true);
    document.getElementById('btnEdit').classList.add('d-none');
    document.getElementById('btnSave').classList.remove('d-none');
}

function setFormEditable(isEditable) {
    const inputs = document.querySelectorAll('#productForm input, #productForm textarea');
    inputs.forEach(input => {
        if(input.id !== 'productId') {
            input.disabled = !isEditable;
        }
    });
}

// --- 8. SAVE (CREATE / UPDATE) ---
async function saveProduct() {
    const id = document.getElementById('productId').value;
    const title = document.getElementById('productTitle').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const description = document.getElementById('productDescription').value;
    const categoryId = parseInt(document.getElementById('productCategoryId').value);
    const imageUrl = document.getElementById('productImage').value;

    const payload = {
        title,
        price,
        description,
        categoryId: categoryId,
        images: [imageUrl || 'https://placehold.co/600x400']
    };

    try {
        let response;
        if (id) {
            // UPDATE
            response = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            // CREATE
            response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (response.ok) {
            const result = await response.json();
            Swal.fire('Thành công', `Đã ${id ? 'cập nhật' : 'tạo'} sản phẩm!`, 'success');
            modalInstance.hide();
            
            // Vì API này là Fake API, dữ liệu tạo mới đôi khi không persist lâu dài
            // hoặc update không phản ánh ngay vào list fetchAll.
            // Để UX tốt, ta reload lại list từ server.
            fetchProducts(); 
        } else {
            Swal.fire('Lỗi', 'Có lỗi xảy ra khi gọi API', 'error');
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Lỗi', 'Lỗi kết nối server', 'error');
    }
}