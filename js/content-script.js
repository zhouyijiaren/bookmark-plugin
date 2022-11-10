// 注意，必须设置了run_at=document_start 此段代码才会生效
document.addEventListener('DOMContentLoaded', function () {
  // injectCustomJs(); // 注入自定义JS
});

// 向页面注入JS
function injectCustomJs(jsPath) {
  jsPath = jsPath || 'js/inject.js';
  var temp = document.createElement('script');
  temp.setAttribute('type', 'text/javascript');
  temp.src = chrome.extension.getURL(jsPath);// 获得的地址类似：chrome-extension://ihcokhadfjfchaeagdoclpnjdiokfakg/js/inject.js
  temp.onload = function () {
    this.parentNode.removeChild(this);
  };
  document.body.appendChild(temp);
}

var server = 'http://49.232.31.142:2000/';
var Authorization = "";
var ret;
function reloadStorage(callBack) {
  chrome.storage.local.get({ bookmarkServer: 'http://49.232.31.142:2000/', Authorization: '' }, function (items) {
    console.log('reloadStorage ', items);
    server = items.bookmarkServer;
    Authorization = items.Authorization;
    callBack && callBack();
  });
}


async function jqAjax(url, type, data, successCallback, errorCallback, beforeSendCallback, completeCallback) {
  chrome.storage.local.get("Authorization", function(items) {
  $.ajax({
    url: url,
    type: type, //GET POST
    contentType: 'application/json', //必须有
    async: true, //或false,是否异步
    data: data,
    timeout: 3000, //超时时间
    dataType: 'json', //返回的数据格式：json/xml/html/script/jsonp/text
    success: function (data, textStatus, jqXHR) {
      successCallback && successCallback(data, textStatus, jqXHR);
    },
    error: function (xhr, textStatus) {
      errorCallback && errorCallback(xhr, textStatus);
    },
    beforeSend: function (xhr) {
        if (!chrome.runtime.error) {
          xhr.setRequestHeader('Authorization', items.Authorization);
        }
        beforeSendCallback && beforeSendCallback(xhr);
      },
      complete: function () {
        completeCallback && completeCallback();
      },
    });
  });
}

function init() {
  console.log('bookmark init contextMenus');
  jqAjax(server + 'api/tags/', 'GET', {}, function (reply) {
    if (reply.code != 0) {
      return;
    }
    let tags = reply.data;
    chrome.contextMenus.removeAll();
    tags.sort((a, b) => a.lastUse > b.lastUse ? -1 : 1);

    const contextPageAddUrl = 'page';
    const contextSelectionAddNote = 'selection';

    var parentIdPageAddUrl = chrome.contextMenus.create({
      title: '添加当前网址到书签系统',
      id: 'PageAddUrl',
      contexts: [contextPageAddUrl],
      onclick: function (info, tab) {
        addBookmark(info, tab, tags[0].id);
      },
    });

    var parentIdSelectionAddNote = chrome.contextMenus.create({
      title: '添加备忘到系统',
      id: 'SelectionAddNote',
      contexts: [contextSelectionAddNote],
      onclick: function (info, tab) {
        addNote(info, tab, tags[0].id);
      },
    });

    for (const tag of tags) {
      chrome.contextMenus.create({
        title: tag.name,
        id: 'u' + tag.id.toString(),
        contexts: [contextPageAddUrl],
        parentId: parentIdPageAddUrl,
        onclick: function (info, tab) {
          addBookmark(info, tab, tag.id);
        },
      });

      chrome.contextMenus.create({
        title: tag.name,
        id: 'n' + tag.id.toString(),
        contexts: [contextSelectionAddNote],
        parentId: parentIdSelectionAddNote,
        onclick: function (info, tab) {
          chrome.tabs.executeScript({ code: 'window.getSelection().toString();' }, function (selection) {
            info.selectionText = selection[0];
            var regex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;
            // 清掉emoji
            info.selectionText = info.selectionText.replace(regex, '');
            addNote(info, tab, tag.id);
          });
        },
      });
    }
  });
}
