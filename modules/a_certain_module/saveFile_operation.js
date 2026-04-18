const saveFile = JSON.parse(localStorage.getItem("JustHex_saveFile")) || {
    row_length:16,
    group_size:4
};

export { saveFile };