`use strict`


localStorage.setItem("JustHex_saveFile",JSON.stringify(saveFile));

let byte_buffer = [];
let is_file_present = false;

const settings_form = document.getElementById("settingsForm");

const container = document.querySelector(".main_area");
const fileInput = document.getElementById("openButton");
const file_contents = document.getElementById("fileContent");

settings_form.addEventListener("submit",updateSettings);
fileInput.addEventListener("change",handleFile);

function updateSettings(event){
    event.preventDefault();
    let rowLength = Number(document.getElementById("rowSize").value);
    let groupSize = Number(document.getElementById("byteGroupSize").value);
    //console.log({rowLength, groupSize});
    if (groupSize<1){
        groupSize=1;
        document.getElementById("byteGroupSize").value = String(1);
    };
    if (rowLength<1){
        rowLength=1;
        document.getElementById("rowSize").value = String(1);
    };
    if (rowLength<groupSize){
        rowLength=groupSize;
        document.getElementById("rowSize").value = document.getElementById("byteGroupSize").value;
    }
    //console.log({rowLength, groupSize});
    
    saveFile.row_length = rowLength;
    saveFile.group_size = groupSize;
    localStorage.setItem("JustHex_saveFile",JSON.stringify(saveFile));

    if (is_file_present){outputFile(byte_buffer);};
}

function add_a_space(a_reading_point){
    if ((a_reading_point+1)%4==0){
        return " "
    } else {
        return ""
    }
}

function correct_length(input_string){
    if (input_string.length==1){
        return ("0"+input_string).toUpperCase();
    } else{
        return (input_string).toUpperCase();
    }
}

function outputFile(buffer){
    file_contents.textContent='';
    const data = new DataView(buffer) || byte_buffer;
    const iterator = {
        idx:0,
        next(){
            const done = this.idx>=data.byteLength;
            if (done){
                return {done, value: null}
            }
            return{
                done,
                value: {
                    idx: this.idx, 
                    byte:correct_length(data.getUint8(this.idx++).toString(16).toUpperCase())
                }
            };
        },
        [Symbol.iterator](){
            return this;
        }
    };

    let row_array = [];
    let li_array = [];
    for (const {idx,byte} of iterator){
        //console.log(a_part_of_data);
        if (idx % saveFile.row_length ==0){
            let ul = document.createElement("ul"); //рядок
            ul.className = "file_ul";
            row_array.push(ul);
        };
        if (idx % saveFile.group_size ==0){
            let li = document.createElement("li"); //елемент рядка
            li.className = "file_li";
            row_array[row_array.length-1].appendChild(li);
            li_array.push(li);
        };
        li_array[li_array.length-1].textContent+=byte;
        file_contents.appendChild(row_array[row_array.length-1]);
    }
}

function handleFile(event){
    const file = event.target.files[0];
    if (!file) {
        console.log("No file selected. Please choose a file.");
        return;
    };
    is_file_present = true; 
    const reader = new FileReader();
    reader.onload = () => {
        //console.log("sent");
        //console.log(reader.result.length);
        //console.log(reader.result.byteLength);
        //console.log(reader.result);
        byte_buffer = reader.result;
        //console.log(byte_buffer);
        outputFile(reader.result);
        
    };
    reader.onerror = () => {
        console.log("Error reading the file. Please try again.");
    };
    reader.readAsArrayBuffer(file);
}



/*
function add_a_quiz(){
    
    if(localStorage.length===0){
        localStorage.setItem(a, a+20);
        let tile = document.createElement("div");
        tile.className = "tile";
        container.appendChild(tile);
        index_array.push(String(String(localStorage.key(a))+" "+String(localStorage.getItem(localStorage.key(a)))));
        tile_array.push(tile);
        console.log(index_array);
        //console.log(tile_array);
        console.log(localStorage)
        a++;
    } else if (localStorage.length>0){
        for (let i = 0;i<index_array.length; i++){
            console.log(index_array)
            console.log(localStorage)
            let temp_array = String(String(localStorage.key(i))+" "+String(localStorage.getItem(localStorage.key(i))))
            if (index_array.indexOf(temp_array)===-1){
                index_array.push(temp_array);
                console.log("check1")
            }
            console.log("")
        }
        if (!localStorage.key(a)){
            console.log("check2")
            localStorage.setItem(a, a+20);
            let tile = document.createElement("div");
            tile.className = "tile";
            container.appendChild(tile);
            tile_array.push(tile);
            a++;
        }
        console.log(index_array);
        console.log(localStorage)
    };
};
function delete_a_quiz(){
    if (localStorage.length>0){
        console.log(index_array);
        console.log(index_array[index_array.length-1]);
        console.log(localStorage.length)
        container.removeChild(tile_array[index_array.length-1]);
        localStorage.removeItem(String(index_array[index_array.length-1]).split(" ")[0]);
        console.log(localStorage)
        tile_array.pop();
        index_array.pop();
        console.log("check3")
        if (!a<=0){
            a--;
        }
    }
};
*/
function clear_my_localStorage(){
    localStorage.clear();
}
