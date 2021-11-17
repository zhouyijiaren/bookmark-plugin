(function (window) {
  var server = 'https://b.lucq.fun/';
  chrome.storage.sync.get({ bookmarkServer: 'https://49.232.31.142:2000/' }, function (items) {
    server = items.bookmarkServer;
    $('.js-popup-server').text(server);
    chrome.tabs.getSelected(null, function (tab) {
      var bg = chrome.extension.getBackgroundPage();
      var tags = [];
      var tagId = null;
      var originUrl = tab.url;
      var originTitle = tab.title || '';
      var title = originTitle.split('-')[0].trim();
      var tempTagId = -1;

      $('#js-url').val(originUrl);
      $('#js-title').val(title);
      $('.js-tags-loading').addClass('active');

      // 拿
      function getTags() {
        bg.jqAjax(server + 'api/tags/', 'GET', {}, function (reply) {
          console.log('get tags', reply);
          $('.js-tags-loading').removeClass('active');

          if (reply.code == 0) {
            $(".js-add-bookmark").show();
            $(".js-login").hide();

            tags = reply.data;
            tags.sort((a, b) => a.lastUse > b.lastUse ? -1 : 1);
            for (let tag of tags) {
              $('#js-add-tag').before(`<div class="ui label js-tag" id="${tag.id}" style="margin:3px 10px 8px 0px;cursor:default;">${tag.name}</div>`);
            }
            

            $("html").css("width", "750px");
            $("html").css("height", $(".js-add-bookmark").height() + 25);
            // 第一个默认设置被选
            if (tags.length > 0) {
              $('#' + tags[0].id).addClass('green');
              tagId = tags[0].id;
            }

            $("#js-tag-input").keypress(function (even) {
              if (even.which == 13) {// 回车按键
                newTagName = $("#js-tag-input").val();
                //TODO zhouxiang==> 这里添加一个green的、id为-1的新tag
                $('#js-add-tag').before(`<div class="ui label js-tag green" id="${tempTagId--}" style="margin:3px 10px 8px 0px;cursor:default;">${newTagName}</div>`);
                
              }
            });

            $('#js-add-tag').click(function () {
              // toastr.info('请到网站分类页面添加分类，3秒后自动打开新的网页。', '提示');
              // setTimeout(() => {
              //   chrome.tabs.create({
              //     url: server + '#/tags',
              //   });
              //   window.close();
              // }, 3000);

            });

            // 这里是 选中就重新设置
            $('.js-tag').live("click", function () {
              // $('.js-tag.green').removeClass('green');
              tagId = $(this).attr('id');
              if ($('#' + tagId).hasClass('green')) {
                $('#' + tagId).removeClass('green');
              } else {
                $('#' + tagId).addClass('green');
              }
            });

          } else if (reply.code == 401) {// 登录逻辑
            $(".js-add-bookmark").hide();
            $(".js-login").show();
            $("html").css("width", "350px");
            $("html").css("height", "260px");

            $('.js-send-login').click(function () {
              let params = {
                username: $('#js-username').val(),
                password: $('#js-password').val()
              };

              $('.js-login-loading').addClass('active');
              bg.jqAjax(server + "api/userLogin/", 'POST', JSON.stringify(params), function (reply) {
                console.log('userLogin reply = ', reply);
                $('.js-login-loading').removeClass('active');
                if (reply.code == 0) {
                  $(".js-add-bookmark").show();
                  $(".js-login").hide();
                  chrome.storage.sync.set({ Authorization: reply.data.token }, function () {
                    bg.reloadStorage(getTags);
                  });
                } else {
                  toastr.error('登录失败，请重试。', '错误');
                }
              })
            });
          } else {// 根本就没有设置后台
            alert("网站设置错误，一定能要设置成"+server+"形式");
          }
          // 必须在返回以后同步执行
          getBeforeTags();
        }, function (error) {
          alert("Server error, it may be down. You can change server url in Plugin config.");
          window.close();
        });
        
      }
      // 拿推荐的tag
      function getRecommendedTags() {
        bg.jqAjax(server + 'api/getKeyword/', 'POST', JSON.stringify({text: title}), function (reply) {
          //alert(JSON.stringify(reply));
          if (reply.code != 0) {
            return;
          }
          for(var i in reply.data.ke) {
            $('#js-recommendation-tag').before(`<div class="ui label js-tag" id="${tempTagId--}" style="margin:3px 10px 8px 0px;cursor:default;">${reply.data.ke[i].word}</div>`);
          }
          
          $("html").css("height", $(".js-add-bookmark").height() + 25);
        });
      }
      // 拿之前设置过的tag
      function getBeforeTags() {
        bg.jqAjax(server + 'api/bookmarkByUrl/', 'GET', {url: originUrl}, function (reply) {
          if (reply.code != 0) {
            return;
          }
          console.log('get befores', reply);
          for(var i of reply.data.tagId.split(',')) {
            $('#' + i).addClass('green');
          }
        });
      }

      getTags();

      getRecommendedTags();

      $('#js-restore-title').click(() => {
        $('#js-title').val(originTitle);
      });

      $('.js-cancel').click(() => {
        window.close();
      });

      $('.js-register').click(() => {
        window.open(server+"#/register")
      });
      
      $('.js-unlogin').click(() => {
        chrome.storage.sync.set({ Authorization: '' }, function () {
          bg.reloadStorage(getTags);
        });
      });

      $('.js-send-bookmark').click(() => {
        var url = server + 'api/bookmarkAdd/';
        // 拿到所有的tags,不再用tagId来代表
        tagsJson = [];
        tagsNames = [];
        $('.js-tag.green').each(function() {
          tagsJson.push($(this).attr('id'));
          tagsNames.push($(this).text());
        });
        var params = {
          url: $('#js-url').val(),
          title: $('#js-title').val(),
          public: $('.ui.checkbox.js-public').checkbox('is checked') ? '1' : '0',
          tagId: tagsJson,
          tagName: tagsNames.join(","),
          description: $('#js-desc').val(),
        };

        // 匹配的正则表达式，后期再详细解析
        if (!/http(s)?:\/\/.*/.test(params.url)) {
          // if (!/http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/.test(params.url)) {
          toastr.error('检撤到您的书签链接非法，是否忘记加http或者https了？建议直接从打开浏览器地址栏复制出来直接粘贴到输入框。', '错误');
        } else if (!tagId) {
          toastr.error('您必须要选择一个分类！可新增分类，如果暂时没想到放到哪个分类，可以先选择未分类', '错误');
        } else if (!params.title) {
          toastr.error('书签标题不能为空！', '错误');
        } else {
          bg.jqAjax(url, 'POST', JSON.stringify(params), function (reply) {
            if (reply.code == 0) {
              var msg = '[ ' + params.title + ' ] 添加成功！' + '\n窗口 1 秒后自动关闭。';
              toastr.success(msg, '提示');
              $('body').dimmer('show');
              setTimeout(() => { window.close(); }, 1000);
            } else {
              if (reply.code == 401) {
                $(".js-add-bookmark").hide();
                $(".js-login").show();
                $("html").css("width", "350px");
                $("html").css("height", "280px");
              }
              toastr.error('[ ' + params.title + ' ] 添加失败', '提示');
            }
          });
        }
        bg.init();
      });
    });
  });
})(window);
