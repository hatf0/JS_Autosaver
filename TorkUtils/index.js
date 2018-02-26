function byteLength(str)
{
    // returns the byte length of an utf8 string
    var s = str.length;
    for (var i=str.length-1; i>=0; i--)
    {
        var code = str.charCodeAt(i);
        if (code > 0x7f && code <= 0x7ff) s++;
        else if (code > 0x7ff && code <= 0xffff) s+=2;
        if (code >= 0xDC00 && code <= 0xDFFF) i--; //trail surrogate
    }
    
    return s;
}

function ToUint8(str)
{
    let ui = new Uint8Array(byteLength(str));
    for(let i = 0; i < byteLength(str); i++)
    {
        ui[i]=str.charCodeAt(i);
    }
    
    return ui;
}

function FromUint8(array)
{
    var out, i, len, c;
    var char2, char3;

    out = "";
    len = array.length;
    i = 0;
    while(i < len)
    {
        c = array[i++];
        switch(c >> 4)
        { 
          case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
            // 0xxxxxxx
            out += String.fromCharCode(c);
            break;
          case 12: case 13:
            // 110x xxxx   10xx xxxx
            char2 = array[i++];
            out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
            break;
          case 14:
            // 1110 xxxx  10xx xxxx  10xx xxxx
            char2 = array[i++];
            char3 = array[i++];
            out += String.fromCharCode(((c & 0x0F) << 12) |
                           ((char2 & 0x3F) << 6) |
                           ((char3 & 0x3F) << 0));
            break;
        }
    }

    return out;
}

function isObject(id)
{
    try
    {
        let findObj = ts.obj(id);
    }
    catch(e)
    {
        return false;
    }
    
    return true;
}

function filePath(str)
{
    return str.substr(0, str.lastIndexOf("/"));
}

function fileBase(str)
{
    return str.substr(str.lastIndexOf("/") + 1, str.lastIndexOf("."));
}

function getFieldCount(str)
{
    let array = str.split('\t');
    return array.length;
}

function getField(str, num)
{
    let returnStr = null;
    let array = str.split('\t');
    if(num < 0)
        num = 0;
    if(num >= array.length)
        num = array.length-1;
    
    try
    {
        returnStr = array[num];
    }
    catch(e)
    {
        return "";
    }
    
    return returnStr;
}

function getFields(str, num1, num2)
{
    let temp;
    if(num1 > num2)
    {
        temp = num1;
        num2 = num1;
        num1 = temp;
    }
    
    let returnStr = null;
    let array = str.split('\t');
    if(num1 < 0)
        num1 = 0;
    if(num2 >= array.length)
        num2 = array.length-1;
    
    try
    {
        for(let i = num1; i <= num2; i++)
        {
            if(returnStr === null)
                returnStr = array[i];
            else
                returnStr += '\t' + array[i];
        }
    }
    catch(e)
    {
        return "";
    }
    
    return returnStr;
}

export {getFields, getField, getFieldCount, fileBase, filePath, isObject, FromUint8, ToUint8, byteLength}