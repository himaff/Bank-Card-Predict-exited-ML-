(function ($) {
    'use strict';
    
    try {
        var selectSimple = $('.js-select-simple');
    
        selectSimple.each(function () {
            var that = $(this);
            var selectBox = that.find('select');
            var selectDropdown = that.find('.select-dropdown');
            selectBox.select2({
                dropdownParent: selectDropdown
            });
        });
    
    } catch (err) {
        console.log(err);
    }

})(jQuery);

Dropzone.options.dataFile = {
    acceptedFiles: ".csv, .xls, .xlsx"
}

// var dropzone = new Dropzone('#dataFile', {
//     previewTemplate: document.querySelector('#preview-template').innerHTML,
//     url: "/file-upload/",
//     thumbnailHeight: 120,
//     thumbnailWidth: 120,
//     maxFilesize: 3,
//     maxFiles: 1,
//     acceptedFiles: '.csv,.xls, .xlsx',
//     addRemoveLinks: true,
//     filesizeBase: 1000,
//     thumbnail: function(file, dataUrl) {
//         if (file.previewElement) {
//             file.previewElement.classList.remove("dz-file-preview");
//             var images = file.previewElement.querySelectorAll("[data-dz-thumbnail]");
//             for (var i = 0; i < images.length; i++) {
//                 var thumbnailElement = images[i];
//                 thumbnailElement.alt = file.name;
//                 thumbnailElement.src = dataUrl;
//             }
//             setTimeout(function() { file.previewElement.classList.add("dz-image-preview"); }, 1);
//         }
//     }
//
// });
//
//
// // Now fake the file upload, since GitHub does not handle file uploads
// // and returns a 404
//
// var minSteps = 6,
//     maxSteps = 60,
//     timeBetweenSteps = 100,
//     bytesPerStep = 100000;
//
// dropzone.uploadFiles = function(files) {
//     var self = this;
//
//     for (var i = 0; i < files.length; i++) {
//
//         var file = files[i];
//         totalSteps = Math.round(Math.min(maxSteps, Math.max(minSteps, file.size / bytesPerStep)));
//
//         for (var step = 0; step < totalSteps; step++) {
//             var duration = timeBetweenSteps * (step + 1);
//             setTimeout(function(file, totalSteps, step) {
//                 return function() {
//                     file.upload = {
//                         progress: 100 * (step + 1) / totalSteps,
//                         total: file.size,
//                         bytesSent: (step + 1) * file.size / totalSteps
//                     };
//
//                     self.emit('uploadprogress', file, file.upload.progress, file.upload.bytesSent);
//                     if (file.upload.progress == 100) {
//                         file.status = Dropzone.SUCCESS;
//                         self.emit("success", file, 'success', null);
//                         self.emit("complete", file);
//                         self.processQueue();
//                     }
//                 };
//             }(file, totalSteps, step), duration);
//         }
//     }
// };
//
// dropzone.on("addedfile", function(file) {
//    console.log(file.fullPath);
// });

var dataFile = new Dropzone("#dataFile");

dataFile.on("sending", function(file) {
    //let ext = file.name.split('.')[1];

    // if (ext == 'csv') {
    var modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('import'));
    modal.hide();

    var modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('viewImport'));
    $('#viewImport .modal-header').show();
    modal.show();

    // }
});

dataFile.on("success", function(file, res) {
    <!-- Table head -->
    var table;
    table = '<thead class="sticky-top bg-white"><tr><th scope="col" class="check-all"><input type="checkbox" class="custom-control-input" id="checkAll" style="width: 12px"></th>';

    res.datas[0].forEach(function(data) {
        table += '<th scope="col">'+data+'</th>';
    });
    table += '</tr></thead><tbody>';
    res.datas[1].forEach(function (data, i) {
        table += '<tr> \
                        <th scope="row"> \
                        </th>';
        data.forEach(function (el) {
            table += '<td>'+el+'</td>';
        });
        table += '</tr>';
    });
    table += '</tbody>';

    $('#dbTable1').html(table);

    var tableLoad
    tableLoad = $('#dbTable1').DataTable({
        searching: false,
        lengthChange: false,
        rowId: 'ID client',
        columnDefs: [ {
            orderable: false,
            className: 'select-checkbox',
            targets:   0
        } ],
        select: {
            style: 'multi',
            selector: 'th:first-child'
        },
        order: [
            [1, 'desc']
        ],
        language: {
            url: 'templates/assets/vendor/datatable/French.json'
        }
    });

    tableLoad.on("click", "th.select-checkbox.check-all", function() {
        if ($("th.select-checkbox.check-all").hasClass("selected")) {
            tableLoad.rows().deselect();
            $("th.select-checkbox.check-all").removeClass("selected");
            $("#checkAll").prop("checked", false);
        } else {
            tableLoad.rows().select();
            $("th.select-checkbox.check-all").addClass("selected");
            $("#checkAll").prop("checked", true);
        }
    }).on("select deselect", function() {
        ("Some selection or deselection going on")

        if (tableLoad.rows({
            selected: true
        }).count() == 0){
            $("#checkAll").prop("checked", false);
            $("#checkAll").prop("indeterminate", false);
            $("#search").hide();
        }
        else if (tableLoad.rows({
            selected: true
        }).count() !== tableLoad.rows().count()) {
            // $("th.select-checkbox.check-all").removeClass("selected");
            $("#checkAll").prop("checked", false);
            $("#checkAll").prop("indeterminate", true);
            $("#search").html('<i class="fa fa-search" aria-hidden="true" ></i> Recherchez '+tableLoad.rows({selected: true}).count()+' Prédictions');
            $("#search").show();

        }
        else {
            // $("th.select-checkbox.check-all").addClass("selected");
            $("#checkAll").prop("checked", true);
            $("#search").html('<i class="fa fa-search" aria-hidden="true" ></i> Recherchez toutes les Prédictions');
            $("#search").show();

        }
    });




    $('#predForm1').on('submit', function (e) {
        e.preventDefault();
        $('#viewImport #spinner').show();
        $('#dbTable1').hide();
        var rows = tableLoad.rows({selected: true }).data().toArray();

        $('#spinner').css('display', 'flex');
        $('.table-all').hide();
        // $('#no-data').hide();
        var el = $('#predForm1');
        // var data = el.serialize();
        el.hide();
        var tableData = '';

        $.ajax({
            type: 'POST',
            url: '/file_predict',
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({columns: res.datas[0], rows: rows}),
            success: function (res) {
                tableData = '<thead class="sticky-top bg-white"><tr><th scope="col" ></th>';

                res.col.forEach(function(data) {
                    tableData += '<th scope="col">'+data+'</th>';
                });
                tableData += '<th scope="col">Prédiction</th>';
                tableData += '</tr></thead><tbody>';
                res.datas.forEach(function(data, i) {
                    tableData += '<tr><th scope="row">'+(i+1)+'</th>';

                    data.forEach(function(d, index) {
                        if (index == 7) {
                            var y = res.pred[i];
                            if (y == 1) {
                                y = "Existing Customer";
                                var ycolor = 'background-color: #d63384;';
                            }
                            else {
                                y = "Attrited Customer";
                                var ycolor = 'background-color: #20c997;';
                            };

                            tableData+='<td>'+d+'</td>';
                            tableData+='<td><span class="badge rounded-pill" style="'+ycolor+'color: white;">'+y+'</span></td>';
                        }
                        else {
                            tableData+='<td>'+d+'</td>';
                        }

                    });
                    tableData += '</tr>';
                });

                $('#viewImport #dbTable1').DataTable().clear().destroy();
                $('#viewImport .table-responsive.table-all #dbTable1').html('');
                $('#viewImport .table-responsive #dbTable1').html(tableData);
                $('#viewImport .table-responsive #dbTable1').DataTable({
                    searching: false,
                    lengthChange: false,
                    language: {
                        url: 'templates/assets/vendor/datatable/French.json'
                    }
                });
                $('#dbTable1').show();
                $('#spinner').hide();
                $('#search').hide();
                // var modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('viewImport'));
                // modal.hide();
                $('.table-all').show();
                el.show();

                // modal.show();
                // $('#viewImport #dbTable2').DataTable();

            }
        });


        // formData = new FormData()
        // formData.append('columns', 'test')
        // formData = "{'columns': 'test'}"
        // fetch('/file_predict', {method: 'POST', body: formData})
        //     .then(response => response.json()).then(data => {
        //     console.log(data)
        // }).catch(error => {
        //     console.log(error)
        // });

        // $.ajax({
        //     type: 'GET',
        //     url: '/predict?'+data,
        //     success: function (res) {
        //         // console.log(res);
        //         res.datas.forEach(function(data, i) {
        //             tableData += '<tr><th scope="row">'+(i+1)+'</th>';
        //
        //             data.forEach(function(d, index) {
        //                 if (index == 8) {
        //                     var y = res.pred[i];
        //                     if (y == 1) {
        //                         y = "Existing Customer";
        //                         var ycolor = 'background-color: #d63384;';
        //                     }
        //                     else {
        //                         y = "Attrited Customer";
        //                         var ycolor = 'background-color: #20c997;';
        //                     };
        //                     if (d == "Existing Customer") {
        //                         var color = 'background-color: #d63384;';
        //                     }  else {
        //                         var color = 'background-color: #20c997;';
        //                     };
        //                     tableData+='<td><span class="badge rounded-pill" style="'+color+'color: white;">'+d+'</span></td>';
        //                     tableData+='<td><span class="badge rounded-pill" style="'+ycolor+'color: white;">'+y+'</span></td>';
        //                 }
        //                 else {
        //                     tableData+='<td>'+d+'</td>';
        //                 }
        //
        //             });
        //             tableData += '</tr>';
        //         });
        //         $('.table.table-striped tbody').html('');
        //         $('.table.table-striped tbody').append(tableData);
        //         $('#spinner').hide();
        //         $('.table-responsive').show();
        //         el.show();
        //
        //     }
        // });
    });

    $('#viewImport #spinner').hide();
    $('#dbTable1').show();

});

dataFile.on("complete", function(file) {
    dataFile.removeFile(file);
});
