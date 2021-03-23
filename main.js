$(document).ready(function (e) {
    // $(window).scroll(makeTagContainerSticky);
    // makeTagContainerSticky();
    window.eventDataManager = new EventDataManager();
    window.eventDataManager.fetchForTag();
    window.modalStateConfigurer = {
        isModalOpen: false,
        modalId: '',
        minimizedModal: {
            modalId: '',
        }
    }
    /**
     * This contains all the fixed DOMs that can be used to render static contents
     */
    window.FIXED_DOMS = {
        FETCH_COMPLETE: `
        <div class="row mt-5 fetch-complete-cont">
            <div class="col">
                <h3 style="color: gray; font-weight: 200" class="text-center">
                    That's all <i class="fa fa-smile-o" aria-hidden="true"></i>
                </h3>
            </div>
        </div>
        `,
        DEFAULT_MODAL_CONTENT: `
        <div class="row h-100 no-gutters bg-light rounded p-3 mb-3"
            style="border-left: 2px solid var(--primary-color);">
            <p>This is going to be a random data about the event for the demo sake, you could ignore
                reading this text if you would like to, because what you are going to read is not worth
                of your time, so i'm sorry if you are still reading this. </p>

            <p>This is going to be a random data about the event for the demo sake, you could ignore
                reading this text if you would like to, because what you are going to read is not worth
                of your time, so i'm sorry if you are still reading this. </p>

            <strong>
                We will have some strong text that needs to be highlighted for the user to read.
            </strong>
        </div>
        <div class="row h-100 no-gutters bg-light mb-3 rounded p-3" style="">
            <div class="col-12">
                <span style="color: #9a9a9a;">
                    <i class="fa fa-eye analytics-attr_icon" aria-hidden="true"></i> 123+
                </span>
                <span style="color: #9a9a9a;" class="ml-3">
                    <i class="fa fa-users analytics-attr_icon" aria-hidden="true"></i> 123+

                </span>
            </div>
        </div>
        `
    };
    window.constants = {
        DT_FORMAT: 'YYYY/MM/DD HH:mm'
    }
    initializeContainerEvents();
});

class EventDataManager {
    constructor() {
        // https://stackoverflow.com/questions/105034/how-to-create-guid-uuid
        this.sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        this.XhrDataMocker = new XHRDataMocker();
        this.fetchedDataManager = new FetchedDataManager();
        /**
         * For each tag we maintain separate paged fetch configurations. So each tag "All", "Premium" has separate content from the backend, 
         * so we maintain each container to have separate fetch configurations so that when ever the scroll is made we fetch the data. The page metadata
         * is stored in the DynamoDB or memcache for the IP&Mac or user name 
         * 
         * @pageSize - fetch size of data
         * @pageNo - page number we are trying to retrieve
         * @fetchLockSemaphore - when fetch in a container is in progress, we do not trigger multiple fetches until one is complete
         */
        this.pageConfigurationForTags = {
            "all": {
                pageSize: 50,
                pageNo: 1,
                fetchLockSemaphore: false
            },
            "leap": {
                pageSize: 50,
                pageNo: 1
            },
            "recruiting": {
                pageSize: 50,
                pageNo: 1
            },
            "premiumonly": {
                pageSize: 50,
                pageNo: 1
            },
            "meetup": {
                pageSize: 50,
                pageNo: 1
            },
            "webinar": {
                pageSize: 50,
                pageNo: 1
            },
            "maskedathon": {
                pageSize: 50,
                pageNo: 1
            }
        };
        this.initializePreComponentEvents();
    }

    /**
     * This will initialize all the events that has to be loaded before loading the data into the container DOMs
     */
    initializePreComponentEvents() {
        $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
            const tag = $(e.target).attr('aria-controls');
            eventDataManager.fetchForTag(tag);
            initializeContainerEvents();
        });
    }

    /**
     * This method fetches data from data store using XHR. but for demo we do not have any XHR and it take data from DataManager
     * 
     * @param {Tag for which the fetch has to be performed. we default to "ALL"} tag  
     */
    fetchForTag(tag = 'all') {
        let pageConfiguration = this.pageConfigurationForTags[tag];
        pageConfiguration.pageNo += 1;
        const getRequestParams = {
            ...pageConfiguration,
            tag
        };
        this.makeXHR(getRequestParams);
    }

    makeXHR(fetchConfiguration) {
        // FIXME, we can use the commented code to fetch the data from backend for the configuration
        /*
        $.get({
            url: 'https://someurl.com',
            data: fetchConfiguration,
            dataType: 'json',
            success: function(data) {

            }
        });
        */


        // this a mocker call which we use to get the data from local store instead of network call
        this.handleFetchCompletion(fetchConfiguration.tag, this.XhrDataMocker.getDataForTag(fetchConfiguration.tag));
    }

    /**
     * This method validates data and renders the same to the User on UI as cards
     * 
     * @param {*} tag 
     * @param {*} data 
     */
    handleFetchCompletion(tag, data = []) {
        if (!tag) {
            console.error('Tag details is missing in the fetch configuration, this leads to data corruption');
            // TODO, log it to backend logs
            return;
        }

        // notify that the data load is complete
        if (!data || data.length == 0) {
            $(`#${tag} .fetch-complete-cont`).remove();
            $(`#${tag} .cards-container`).append(FIXED_DOMS.FETCH_COMPLETE);
        }

        // load data into central store
        this.fetchedDataManager.loadData(tag, data);

        for (let i = 0; i < data.length; i += 1) {
            let eventData = data[i];
            // featured will be a row rendered
            if (eventData.isFeatured) {
                // FIXME expensive operation .append();
                $(`#${tag} .cards-container`).append(`
                    <div class="row no-gutters d-flex justify-content-center align-items-center">
                        ${this.constructEventDOM(eventData)}
                    </div>`);
            } else {
                let nonFeaturedContainerToAppend = $(`#${tag} .non-featured_cont .card-holder`);
                console.log(nonFeaturedContainerToAppend.length);
                if (nonFeaturedContainerToAppend.length) {
                    $(nonFeaturedContainerToAppend).append(this.constructEventDOM(eventData));
                } else {
                    $(`#${tag} .cards-container`).append(`
                    <div class="row justify-content-center non-featured_cont">
                        <div class="col-9">
                            <div class="row card-holder">
                                ${this.constructEventDOM(eventData)}
                            </div
                        </div>
                    </div>
                    `);
                }
            }
        }
        // $(`#${tag}`).append(loadedDOMContainers);
    }

    constructEventDOM(eventData) {
        const id = eventData.id;
        if (eventData.isFeatured) {
            return `
            <div class="col-md-9 top-event w-100">
                <div class="card shadow zoomed" data-event-id="${id}">
                    <div class="row no-gutters">
                        <div class="col-md-4 p-3">
                            <img src="https://vectr.com/asadhsheriff/aeCDAeGRb.svg?width=192.94&amp;height=158.19&amp;select=a1VZJhrxO2,c5dkczZWu8,b39i9Rnku2,e2XyjzHbp2,c8nochkJtX,f12JH8Mskm,b2jrttm9cF,anHGJ4HWt,a4O0nvBzeE,b63NF3qEP,adcgBDFS8,a1ppqRP2m,cU1yPWbFO,n2bOr1wZR,ebJ2y0msh,k5hQnvCm7,b9J4d3FGj,b15mrtadVx,b2DiHqs9yt,ecybsRnUA,c74LskCSVH,b33GfFudMH,bvoldSJgt,h2GrhtCIdH,b1hmJXvYpH,bhgat4Tgy,b2lu1ZkRt6,bmubtGyop,bvJEh4Dlj,b6wXwI5ELR,b4x7PNO0eB,b9QgNp9sC,a2j3b1OAXo,gAROx5iD2,b1ko8dmDu2,cl4oAqxNe,k1plHrh1Ui,a3nC5pkToI,cawWEkQsa,gaX9SpFbN,b1r65JHm4g,c2Bjx0hbQ,aDJ6SHYbr,b3W6vNoXA&amp;source=selection"
                                class="card-img" alt="${eventData.details.slug.altText}" style="">
                        </div>
                        <div class="col-md-8">
                            ${this.getCardBodyContainer(eventData)}
                        </div>

                    </div>
                </div>
            </div>`;
        } else {
            return `
            <div class="col-md-4 p-2" data-event-id="${id}">
                <div class="card shadow zoomed" data-event-id="${id}">
                    ${eventData.isPremium ? 
                        `<div style="position: absolute;right: 5px;top: 5px;">
                            <span>
                                <i class="fa fa-star gold-gradient" aria-hidden="true"></i>
                                            <span class="gold-gradient" style="font-size: 12px;">
                                                <button class="premium-btn">premium</button></span>
                            </span>
                        </div>`: ''}
                    <img src="https://vectr.com/asadhsheriff/aeCDAeGRb.svg?width=192.94&amp;height=158.19&amp;select=a1VZJhrxO2,c5dkczZWu8,b39i9Rnku2,e2XyjzHbp2,c8nochkJtX,f12JH8Mskm,b2jrttm9cF,anHGJ4HWt,a4O0nvBzeE,b63NF3qEP,adcgBDFS8,a1ppqRP2m,cU1yPWbFO,n2bOr1wZR,ebJ2y0msh,k5hQnvCm7,b9J4d3FGj,b15mrtadVx,b2DiHqs9yt,ecybsRnUA,c74LskCSVH,b33GfFudMH,bvoldSJgt,h2GrhtCIdH,b1hmJXvYpH,bhgat4Tgy,b2lu1ZkRt6,bmubtGyop,bvJEh4Dlj,b6wXwI5ELR,b4x7PNO0eB,b9QgNp9sC,a2j3b1OAXo,gAROx5iD2,b1ko8dmDu2,cl4oAqxNe,k1plHrh1Ui,a3nC5pkToI,cawWEkQsa,gaX9SpFbN,b1r65JHm4g,c2Bjx0hbQ,aDJ6SHYbr,b3W6vNoXA&amp;source=selection"
                        class="card-img-top" alt="${eventData.details.slug.altText}" style="height: 100px;margin-top: 1em;">
                        ${this.getCardBodyContainer(eventData)}
                </div>
            </div>`;
        }
    }

    formatEventTimelineForSmallCard(eventStartTime, eventEndTime) {
        const startTime = moment(eventStartTime);
        const endTime = moment(eventEndTime);
        if (startTime.format('MMM') === endTime.format('MMM')) {
            return `${startTime.format('MMM')} ${startTime.format('DD')} - ${endTime.format('DD')}`;
        } else {
            return `${startTime.format('MMM')}, ${startTime.format('DD')} -  ${endTime.format('MMM')}, ${endTime.format('DD')}`;
        }
    }

    getCardBodyContainer(eventData) {
        const id = eventData.id;
        return `
            <div class="card-body" id="card-event-${id}">
                <h5 class="card-title primary-font-color text-truncate">${eventData.details.title}
                    ${(eventData.isPremium)?
                    `<span><i class="fa fa-star gold-gradient" aria-hidden="true"></i>
                        <span class="gold-gradient" style="font-size: 12px;">
                            <button class="premium-btn">premium</button></span>
                    </span>`: ''}
                </h5>
                <div class="row mb-2">
                    <div class="col-1 text-center primary-font-color">
                        <i class="fa fa-calendar" aria-hidden="true"></i>
                    </div>
                    <div class="col-10">
                        <span class="text-truncate">${this.formatEventTimelineForSmallCard()}</span>
                    </div>
                </div>
                <div class="row mb-2">
                    <div class="col-1 text-center primary-font-color">
                        <i class="fa fa-map-marker" aria-hidden="true"></i>
                    </div>
                    <div class="col-10">
                        <span class="text-truncate">
                            ${eventData.eventLocation.isOnline? 'Online': eventData.eventLocation.location}
                        </span>
                    </div>
                </div>
                <div class="row mb-2">
                    <div class="col-1 text-center primary-font-color">
                        <i class="fa fa-microphone" aria-hidden="true"></i>
                    </div>
                    <div class="col-10">
                        <span class="text-truncate">
                            ${eventData.details.speaker.name}
                        </span>
                    </div>
                </div>
                <div class="row mb-2">
                    <div class="col-1 text-center primary-font-color">
                        <i class="fa fa-bell-o" aria-hidden="true"></i>
                    </div>
                    <div class="col-10">
                        <span class="text-truncate">
                            ${(eventData.details.deadline && eventData.details.deadline !== 'NA') ?
                            moment(eventData.details.deadline).format('MMM, DD HH:MM'): 'NA'}
                        </span>
                    </div>
                </div>
                <div class="row mb-4">
                    <div class="col-12">
                        <span style="color: #9a9a9a;font-size: 12px;">
                            <i class="fa fa-eye analytics-attr_icon" aria-hidden="true"></i>
                            ${eventData.analytics.viewCount}+
                        </span>
                        <span style="color: #9a9a9a;font-size: 12px;" class="ml-3">
                            <i class="fa fa-users analytics-attr_icon"
                                aria-hidden="true"></i> ${eventData.analytics.appliedCount}+
                        </span>
                    </div>
                </div>
                <div class="w-100 text-right px-2 d-none d-md-block">
                    <button class="shadow mr-2 card-action-secondary_btn share" data-event-id="${id}">
                        <i class="fa fa-share" aria-hidden="true"></i> Share
                    </button>
                    <button class="shadow card-action-primary_btn apply" data-event-id="${id}"">
                        <i class="fa fa-hand-pointer-o" aria-hidden="true"></i>Apply
                    </button>
                </div>

                <div class="row d-md-none">
                    <div class="col-6">
                        <button
                            class="w-100 card-action-secondary_btn shadow share" data-event-id="${id}">
                            <i class="fa fa-share" aria-hidden="true"></i> Share
                        </button> </div>
                    <div class="col-6"><button
                            class="w-100 card-action-primary_btn shadow apply" data-event-id="${id}">
                            <i class="fa fa-hand-pointer-o" aria-hidden="true"></i>
                            Apply
                        </button>
                    </div>
                </div>

            </div>`;
    }

    loadDataToDataStore(tag, data = []) {
        this.fetchedDataForTags.all = this.fetchedDataForTags.all.concat(data);
    }
}

/**
 * This method loads all events necessary to make the cards functional
 */
let initializeContainerEvents = function () {
    $('.card').click(function (e) {
        if (!$(e.target).hasClass('share') && !$(e.target).hasClass('apply')) {
            openEventModal(e);
        }
    });

    $('.share').click(function (e) {
        openShareModal(e);
    });

    $('.apply').click(function (e) {
        applyEvent(e);
    });

    $('.masked-btn').on('click', function (event) {
        if (this.hash !== "") {
            event.preventDefault();
            var hash = this.hash;
            $('html, body').animate({
                scrollTop: $(hash).offset().top
            }, 800, function () {
                window.location.hash = hash;
            });
        } // End if
    });
}

/**
 * This method essentially updates the data store and applies the same
 * 
 * @param {*} element 
 */
let applyEvent = function (element) {
    const eventId = $(element.delegateTarget).data('event-id');

    if (eventDataManager.fetchedDataManager.isPremium(eventId)) {
        const eventData = eventDataManager.fetchedDataManager.getData(eventId);

        $('body').append(`
            <div class="modal" id="premium-alert-${eventId}" tabindex="-1" aria-labelledby="premium-alert-${eventId}" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content premium-border">
                        <div class="modal-body">
                            <div class="w-100 d-flex flex-column justify-content-center align-items-center px-3">
                                <div class="w-100">
                                    <button type="button" class="close float-right" data-dismiss="modal" aria-label="Close">
                                            <span aria-hidden="true" style="color:black">&times;</span>
                                    </button>
                                </div>
                                <h4 class="gold-gradient mb-4">
                                    ${eventData.details.title}
                                </h4>
                                <div class="w-100 text-center mb-4">
                                    <h5 style="font-weight: 300">The event is reserved only for premium customers!</h5>
                                    <p style="font-weight: 200">
                                        We have thousands of live training programs and events especially designed to help maskeders get highlighted during interviews. On an average 64% of permium memebers are likely to get called for interviews.
                                    </p>
                                    <a class="card-action-secondary_btn" href="https://www.masked.com/premium" target="_blank">Know more</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`);

        $(`#premium-alert-${eventId}`).on('hidden.bs.modal', function (e) {
            $(e.delegateTarget).remove();
        });

        $(`#premium-alert-${eventId}`).modal({
            backdrop: 'static',
            keyboard: false
        });
    } else {
        if (eventDataManager.fetchedDataManager.applyForId(eventId)) {
            $(element.delegateTarget).addClass('disable-opac');
            $(element.delegateTarget).text('Applied');
            $(element.delegateTarget).attr('disabled', true);

            $(`#card-event-${eventId} .apply`).addClass('disable-opac');
            $(`#card-event-${eventId} .apply`).text('Applied');
            $(`#card-event-${eventId} .apply`).attr('disabled', true);
        } else {
            $(element.delegateTarget).removeClass('disable-opac');
            $(element.delegateTarget).attr('disabled', false);
        }
    }

};

let openEventModal = function (element) {
    const eventId = $(element.delegateTarget).data('event-id');
    const modalId = `modal-${new Date().getUTCMilliseconds()}-${eventId}`;
    if (!eventId || eventId === '') {
        return;
    }

    const eventData = eventDataManager.fetchedDataManager.getData(eventId);
    if (!eventData) {
        return;
    }

    let getFormattedDatetimeline = function (data) {
        let startDate = moment(data.eventStartTime);
        let endDate = moment(data.eventEndTime);

        return `<div class="col-10 no-gutters d-flex flex-row">
                    <div class="mr-3">
                        <div>
                            ${startDate.format('MMM DD, YY')}
                        </div>
                        <div><small>
                                ${startDate.format('HH:mm')}
                            </small>
                        </div>
                    </div>
                    <div class="">
                        <div>
                            ${endDate.format('MMM DD, YY')}
                        </div>
                        <div><small>
                            ${endDate.format('HH:mm')}
                            </small>
                        </div>
                    </div>
                </div>`;
    };
    $('body').append(
        `<div class="modal" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content">
                    <div class="modal-body">
                        <div class="w-100 mb-5">
                            <h2 class="primary-font-color mb-1">
                                ${eventData.details.title}
                                ${(eventData.isPremium)?
                                `<span><i class="fa fa-star gold-gradient" aria-hidden="true"></i>
                                    <span class="gold-gradient" style="font-size: 12px;">
                                        <button class="premium-btn">premium</button></span>
                                </span>` : ''}
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                    <span aria-hidden="true">&times;</span>
                                </button>
                            </h2>
                            <small class="text-muted">
                                <i class="fa fa-pencil" aria-hidden="true"></i>
                                ${moment(eventData.created).format('MMM DD, HH:mm')}
                            </small>
                        </div>
                        <div class="container-fluid">
                            <div class="row h-100 no-gutters bg-light mb-3 rounded"
                                style="border-left: 2px solid var(--primary-color);">
                                <div class="col-md-6 mb-2" style="height: 50px;">
                                    <div class="row no-gutters">
                                        <div
                                            class="col-2 d-flex justify-content-center align-items-center primary-font-color">
                                            <i class="fa fa-calendar fa-2x" aria-hidden="true"></i>
                                        </div>
                                        ${getFormattedDatetimeline(eventData)}
                                    </div>
                                </div>
                                <div class="col-md-6 mb-2" style="height: 50px;">
                                    <div class="row h-100 no-gutters">
                                        <div
                                            class="col-2 d-flex justify-content-center align-items-center primary-font-color">
                                            <i class="fa fa-bell fa-2x" aria-hidden="true"></i>
                                        </div>
                                        <div class="col-10 d-flex align-items-center">
                                            ${(eventData.details.deadline && eventData.details.deadline !== 'NA')? moment(eventData.details.deadline).format('MMM DD, HH:mm'): ''}
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6" style="height: 50px;">
                                    <div class="row h-100 no-gutters">
                                        <div
                                            class="col-2 d-flex align-items-center primary-font-color justify-content-center">
                                            <i class="fa fa-map-marker fa-2x" aria-hidden="true"></i>
                                        </div>
                                        <div class="col-10 d-flex align-items-center">
                                            <span class="text-truncate">
                                                ${(eventData.eventLocation.isOnline)? "Online": eventData.eventLocation.location}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6" style="height: 50px;">
                                    <div class="row no-gutters h-100">
                                        <div
                                            class="col-2 d-flex align-items-center justify-content-center primary-font-color">
                                            <i class="fa fa-microphone fa-2x" aria-hidden="true"></i>
                                        </div>
                                        <div class="col-10 d-flex align-items-center">
                                            <span class="text-truncate">
                                                ${eventData.details.speaker.name}, ${eventData.details.speaker.title}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            ${(eventData.details.descriptionHtml === '') ? FIXED_DOMS.DEFAULT_MODAL_CONTENT : eventData.details.descriptionHtml}
                            <div class="row h-100 no-gutters  rounded p-3" style="">
                                <div class="col text-right">
                                    <button class="shadow mr-2 card-action-secondary_btn share-modal" data-event-id="${eventData.id}">
                                        <i class="fa fa-share" aria-hidden="true"></i> Share
                                    </button>
                                    <button class="shadow card-action-primary_btn apply ${eventData.isApplied? 'disable-opac': ''}" data-event-id="${eventData.id}" ${eventData.isApplied? 'disabled="true"': ''}>
                                        ${eventData.isApplied? 'Applied': '<i class="fa fa-hand-pointer-o" aria-hidden="true"></i>  Apply'}
                                    </button>

                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`
    );

    $('.share-modal').click(function (e) {
        // minimize existing modal and open the new one
        openShareModalWithModal(e);

    });

    $(`#${modalId} .apply`).click(function (e) {
        // minimize existing modal and open the new one
        applyEvent(e);

    });

    $(`#${modalId}`).on('hidden.bs.modal', function (event) {
        const modalId = $(event.delegateTarget).attr('id');
        if (modalId !== modalStateConfigurer.minimizedModal.modalId) {
            $(event.delegateTarget).remove();
        }
    });
    $(`#${modalId}`).modal({
        backdrop: 'static',
        keyboard: false
    });
    modalStateConfigurer.isModalOpen = true;
    modalStateConfigurer.modalId = modalId;

    eventDataManager.fetchedDataManager.incrementViewCountForId(eventId);
}

openShareModal = function (element) {
    const idInfo = createModal(element);
    if (idInfo && idInfo.modalId) {
        let cancelBtn = $(`#${idInfo.modalId} .share-cancel`).first()
        $(cancelBtn).removeClass('share-cancel');
        $(cancelBtn).addClass('share');

        $(`#${idInfo.modalId}`).on('hidden.bs.modal', function (e) {
            $(`#${idInfo.modalId}`).remove();
        });

        $(`#${idInfo.modalId}`).modal({
            backdrop: 'static',
            keyboard: false
        });
    }
}

openShareModalWithModal = function (element) {
    const idInfo = createModal(element);

    if (idInfo && idInfo.modalId) {
        $(`#${idInfo.modalId}`).on('hidden.bs.modal', function (e) {
            // reopen the modal;
            $(`#${modalStateConfigurer.modalId}`).remove();
            modalStateConfigurer.modalId = modalStateConfigurer.minimizedModal.modalId;
            modalStateConfigurer.minimizedModal.modalId = undefined;
            $(`#${modalStateConfigurer.modalId}`).modal('show');
        });

        if (modalStateConfigurer.isModalOpen && modalStateConfigurer.modalId != "") {
            modalStateConfigurer.minimizedModal.modalId = modalStateConfigurer.modalId;
            modalStateConfigurer.modalId = idInfo.modalId;
            $(`#${modalStateConfigurer.minimizedModal.modalId}`).modal('hide');
            $(`#${idInfo.modalId}`).modal({
                backdrop: 'static',
                keyboard: false
            });
        }
    }

}

/**
 * This will create a modal and return modalId and eventId
 */
createModal = function (element) {
    const id = {
        eventId: $(element.delegateTarget).data('event-id'),
        modalId: `modal-share-${$(element.delegateTarget).data('event-id')}`
    };

    if (!id.eventId || id.eventId === "") {
        // FIXME log to backend
        return;
    }

    const eventData = eventDataManager.fetchedDataManager.getData(id.eventId);

    $('body').append(
        `<div class="modal" id="${id.modalId}" data-backdrop="static" data-keyboard="false" tabindex="-1"
            aria-labelledby="${id.modalId}" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered ">
                <div class="modal-content">
                    <div class="modal-body">
                        <h5 class="primary-font-color mb-5 text-center">
                            Share your favorite events with your friends
                        </h5>
                        <div class="w-100 text-left px-2 pb-3">
                            <label style="font-size: 0.75em;">Message to share</label>
                            <textarea id="share-content" row="3" class="form-control"
                                placeholder="share ${eventData.details.slug.link}" style="resize: none;">Hello friends, I found this event very exciting and thought of sharing with you all! Checkout event ${eventData.details.title}</textarea>
                        </div>
                        <div class="row no-gutters mb-5">
                            <div class="col-12 d-flex flex-rows justify-content-center">
                                <button class="mr-3 share-btn" data-platform="LinkedIn" data-event-id="${id.eventId}" data-modal-id="${id.modalId}">
                                    <i class="fa fa-linkedin-square fa-2x" aria-hidden="true"
                                        style="color: var(--primary-color)"></i>
                                </button>
                                <button class="mr-3 share-btn" data-platform="Twitter" data-event-id="${id.eventId}" data-modal-id="${id.modalId}">
                                    <i class="fa fa-twitter-square fa-2x" aria-hidden="true"
                                        style="color: var(--primary-color);"></i>
                                </button>
                                <button class="share-btn" data-platform="Facebook" data-event-id="${id.eventId}" data-modal-id="${id.modalId}">
                                    <i class="fa fa-facebook-square fa-2x" aria-hidden="true"
                                        style="color: var(--primary-color);"></i>
                                </button>
                            </div>
                        </div>
                        <div class="w-100 text-center">
                            <button class="card-action-secondary_btn share-cancel" data-dismiss="modal" aria-label="Close" data-modal-id="${id.modalId}">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`
    );

    $('.share-cancel').click(function (e) {
        $(`#${$(e.delegateTarget).data('modal-id')}`).modal('hide');
        $(`#${$(e.delegateTarget).data('modal-id')}`).remove();
    });

    $('.share-btn').click(function (e) {
        const platform = $(e.delegateTarget).data('platform');
        const eventId = $(e.delegateTarget).data('event-id');
        const eventData = eventDataManager.fetchedDataManager.getData(eventId);
        const shareText = encodeURIComponent($('#share-content').val());
        const modalId = $(e.delegateTarget).data('modal-id');

        if (!eventData || !modalId) {
            return;
        }

        switch (platform) {
            case "Facebook":
                window.open(`http://www.facebook.com/sharer.php?s=100&p[title]=${encodeURIComponent(eventData.details.title)}&p[summary]=${shareText}&p[url]=${encodeURIComponent(eventData.details.slug.link)}`, '_blank');
                setTimeout(function () {
                    closeShareModal(modalId);
                }, 1000);
                break;
            case "Twitter":
                window.open(`https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(eventData.details.slug.link)}`, '_blank');
                setTimeout(function () {
                    closeShareModal(modalId);
                }, 1000);
                break;
            case "LinkedIn":
                window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(eventData.details.slug.link)}&title=${shareText}`, '_blank');
                setTimeout(function () {
                    closeShareModal(modalId);
                }, 1000);
                break;
            default:
        }
    })

    return id;
}

closeShareModal = function (modalId) {
    $(`#${modalId}`).modal('hide');
    // $(`#${modalId}`).remove();
}

/**
 * This will be central data store where data writes will be stored and retrieved in UI. Technically this will be working along with some XHR requests to 
 * write data to backend data store as well.
 */
class FetchedDataManager {
    constructor() {
        this.masterDataStore = {};
        this.fetchedDataIdsForTags = {
            "all": [],
            "leap": [],
            "recruiting": [],
            "premiumonly": [],
            "meetup": [],
            "webinar": [],
            "maskedathon": []
        }
    }

    loadData(tag, data = []) {
        for (let i = 0; i < data.length; i += 1) {
            this.masterDataStore[data[i].id] = data[i];
            this.fetchedDataIdsForTags[tag].push(data[i].id);
        }
    }

    getData(id) {
        if (id in this.masterDataStore) {
            return {
                ...this.masterDataStore[id]
            };
        }
    }

    applyForId(id) {
        if (id in this.masterDataStore) {
            this.masterDataStore[id].isApplied = true;
        }
        return this.masterDataStore[id].isApplied;
    }

    incrementViewCountForId(id) {
        if (id in this.masterDataStore) {
            this.masterDataStore[id].analytics.viewCount++;
            return this.masterDataStore[id].analytics.viewCount;
        }
        return 0;

    }

    isPremium(id) {
        if (id in this.masterDataStore) {
            return this.masterDataStore[id].isPremium;
        }
        return false;
    }
}

/**
 * This class mock is to provide data in sequence just like how the backend would provide. The data is mocked and paging is not implemented yet
 */
class XHRDataMocker {
    constructor() {
        this.data = {
            "all": [{
                    "id": "1",
                    "tags": ["all", "recruiting"],
                    "eventStartTime": "2020/08/20 14:30",
                    "eventEndTime": "2020/08/20 15:30",
                    "eventLocation": {
                        "isOnline": true,
                        "location": ""
                    },
                    "isPremium": true,
                    "details": {
                        "title": "Virtual Hiring Event for Women",
                        "thumbnailGist": "",
                        "deadline": "2020/08/01 00:00",
                        "slug": {
                            "altText": "Virtual Hiring Event for women",
                            "link": "https://www.masked.com/event/jgsy787",
                            "thumbnailUrl": "",
                            "url": ""
                        },
                        "descriptionHtml": "",
                        "speaker": {
                            "name": "Paul Din",
                            "title": "Director of HR @ Zoop"
                        }
                    },
                    "isApplied": false,
                    "created": "2020/08/01 09:53",
                    "analytics": {
                        "appliedCount": 96,
                        "viewCount": 767
                    },
                    "isFeatured": true
                },
                {
                    "id": "2",
                    "tags": ["all", "meetup"],
                    "eventStartTime": "2020/09/11 14:30",
                    "eventEndTime": "2020/09/11 15:30",
                    "eventLocation": {
                        "isOnline": false,
                        "location": "Vancouver, Canada"
                    },
                    "isPremium": false,
                    "details": {
                        "title": "2020, Graduate Hiring",
                        "thumbnailGist": "",
                        "deadline": "2020/08/31 00:00",
                        "slug": {
                            "altText": "2020, Graduate Hiring",
                            "link": "https://www.masked.com/event/uh187xj",
                            "thumbnailUrl": "",
                            "url": ""
                        },
                        "descriptionHtml": "",
                        "speaker": {
                            "name": "Asadh Sheriff",
                            "title": "Technology Recuriter @ D.E.Shaw"
                        }
                    },
                    "isApplied": false,
                    "created": "2020/09/03 11:53",
                    "analytics": {
                        "appliedCount": 96,
                        "viewCount": 767
                    }
                },
                {
                    "id": "3",
                    "tags": ["all", "recruiting"],
                    "eventStartTime": "2020/09/17 09:30",
                    "eventEndTime": "2020/09/18 17:30",
                    "eventLocation": {
                        "isOnline": true,
                        "location": ""
                    },
                    "isPremium": false,
                    "details": {
                        "title": "Virtual Hiring Event for 2021, Graduates",
                        "thumbnailGist": "",
                        "deadline": "2020/09/16 00:00",
                        "slug": {
                            "altText": "Virtual Hiring Event for 2021, Graduates",
                            "link": "https://www.masked.com/event/jhg2qu1",
                            "thumbnailUrl": "",
                            "url": ""
                        },
                        "descriptionHtml": "",
                        "speaker": {
                            "name": "Kevin Rodrick",
                            "title": "Marketing Head @ Google"
                        }
                    },
                    "isApplied": false,
                    "created": "2020/09/03 11:53",
                    "analytics": {
                        "appliedCount": 96,
                        "viewCount": 767
                    }
                },
                {
                    "id": "4",
                    "tags": ["all", "webinar"],
                    "eventStartTime": "2020/09/21 12:30",
                    "eventEndTime": "2020/09/21 14:30",
                    "eventLocation": {
                        "isOnline": true,
                        "location": ""
                    },
                    "isPremium": true,
                    "details": {
                        "title": "Women changing the world, Webinar",
                        "thumbnailGist": "",
                        "deadline": "NA",
                        "slug": {
                            "altText": "Women changing the world, Webinar",
                            "link": "https://www.masked.com/event/lki29ial",
                            "thumbnailUrl": "",
                            "url": ""
                        },
                        "descriptionHtml": "",
                        "speaker": {
                            "name": "Kamala Harris",
                            "title": "US Senate, Democrats"
                        }
                    },
                    "isApplied": false,
                    "created": "2020/09/03 11:53",
                    "analytics": {
                        "appliedCount": 96,
                        "viewCount": 767
                    }
                },
                {
                    "id": "5",
                    "tags": ["all", "meetup"],
                    "eventStartTime": "2020/10/20 14:30",
                    "eventEndTime": "2020/10/20 15:30",
                    "eventLocation": {
                        "isOnline": true,
                        "location": ""
                    },
                    "isPremium": false,
                    "details": {
                        "title": "How to find a best candidate?",
                        "thumbnailGist": "",
                        "deadline": "2020/08/01 00:00",
                        "slug": {
                            "altText": "How to find a best candidate?",
                            "link": "https://www.masked.com/event/jh2iuz1",
                            "thumbnailUrl": "",
                            "url": ""
                        },
                        "descriptionHtml": "",
                        "speaker": {
                            "name": "Rodger Fernandez",
                            "title": "Founder & CTO & Zaprun"
                        }
                    },
                    "isApplied": false,
                    "created": "2020/09/10 11:53",
                    "analytics": {
                        "appliedCount": 96,
                        "viewCount": 767
                    }
                },
                {
                    "id": "6",
                    "tags": ["all", "meetup"],
                    "eventStartTime": "2020/08/20 14:30",
                    "eventEndTime": "2020/08/20 15:30",
                    "eventLocation": {
                        "isOnline": true,
                        "location": ""
                    },
                    "isPremium": false,
                    "details": {
                        "title": "Guidelines to crack interview",
                        "thumbnailGist": "",
                        "deadline": "2020/08/01 00:00",
                        "slug": {
                            "altText": "Guidelines to crack interview",
                            "link": "https://www.masked.com/event/1fsw7y8",
                            "thumbnailUrl": "",
                            "url": ""
                        },
                        "descriptionHtml": "",
                        "speaker": {
                            "name": "Lee D.",
                            "title": "Software Engineer 2 @ Walmart Labs"
                        }
                    },
                    "isApplied": false,
                    "created": "2020/09/03 11:53",
                    "analytics": {
                        "appliedCount": 96,
                        "viewCount": 767
                    }
                },
                {
                    "id": "7",
                    "tags": ["all", "maskedathon"],
                    "eventStartTime": "2020/10/28 09:30",
                    "eventEndTime": "2020/10/29 17:30",
                    "eventLocation": {
                        "isOnline": false,
                        "location": "Vancouver, Canada"
                    },
                    "isPremium": false,
                    "details": {
                        "title": "Spring Hackathon for 2 days!",
                        "thumbnailGist": "",
                        "deadline": "2020/10/01 6:30",
                        "slug": {
                            "altText": "Spring Hackathon for 2 days!",
                            "link": "https://www.masked.com/event/876we9",
                            "thumbnailUrl": "",
                            "url": ""
                        },
                        "descriptionHtml": "",
                        "speaker": {
                            "name": "Bryan Raj",
                            "title": "Engineering Manager @Google"
                        }
                    },
                    "isApplied": false,
                    "created": "2020/09/24 14:23",
                    "analytics": {
                        "appliedCount": 121,
                        "viewCount": 24
                    }
                }, {
                    "id": "8",
                    "tags": ["all", "leap"],
                    "eventStartTime": "2020/11/20 11:30",
                    "eventEndTime": "2020/11/20 15:30",
                    "eventLocation": {
                        "isOnline": false,
                        "location": "1056, Queen Street, Toronto"
                    },
                    "isPremium": true,
                    "details": {
                        "title": "Career guidance Leap counselling",
                        "thumbnailGist": "",
                        "deadline": "2020/11/25 00:00",
                        "slug": {
                            "altText": "Career guidance Leap counselling",
                            "link": "https://www.masked.com/event/213hsd",
                            "thumbnailUrl": "",
                            "url": ""
                        },
                        "descriptionHtml": "",
                        "speaker": {
                            "name": "Robet Langdon",
                            "title": "Human Resource Head @ ZAAM"
                        }
                    },
                    "isApplied": false,
                    "created": "2020/10/01 09:53",
                    "analytics": {
                        "appliedCount": 116,
                        "viewCount": 87
                    },
                    "isFeatured": false
                }, {
                    "id": "9",
                    "tags": ["all", "leap"],
                    "eventStartTime": "2020/11/10 09:30",
                    "eventEndTime": "2020/11/11 16:30",
                    "eventLocation": {
                        "isOnline": false,
                        "location": "2012, Victoria Street, Toronto"
                    },
                    "isPremium": false,
                    "details": {
                        "title": "What Talent Acquisition is?",
                        "thumbnailGist": "",
                        "deadline": "2020/11/25 00:00",
                        "slug": {
                            "altText": "What Talent Acquisition is?",
                            "link": "https://www.masked.com/event/12423h",
                            "thumbnailUrl": "",
                            "url": ""
                        },
                        "descriptionHtml": "",
                        "speaker": {
                            "name": "Henry Ford",
                            "title": "Business Administration Head @ Lotto"
                        }
                    },
                    "isApplied": false,
                    "created": "2020/10/01 19:53",
                    "analytics": {
                        "appliedCount": 16,
                        "viewCount": 190
                    },
                    "isFeatured": false
                }
            ],
            "leap": [{
                "id": "8",
                "tags": ["all", "leap"],
                "eventStartTime": "2020/11/20 11:30",
                "eventEndTime": "2020/11/20 15:30",
                "eventLocation": {
                    "isOnline": false,
                    "location": "1056, Queen Street, Toronto"
                },
                "isPremium": true,
                "details": {
                    "title": "Career guidance Leap counselling",
                    "thumbnailGist": "",
                    "deadline": "2020/11/25 00:00",
                    "slug": {
                        "altText": "Career guidance Leap counselling",
                        "link": "https://www.masked.com/event/213hsd",
                        "thumbnailUrl": "",
                        "url": ""
                    },
                    "descriptionHtml": "",
                    "speaker": {
                        "name": "Robet Langdon",
                        "title": "Human Resource Head @ ZAAM"
                    }
                },
                "isApplied": false,
                "created": "2020/10/01 09:53",
                "analytics": {
                    "appliedCount": 116,
                    "viewCount": 87
                },
                "isFeatured": true
            }, {
                "id": "9",
                "tags": ["all", "leap"],
                "eventStartTime": "2020/11/10 09:30",
                "eventEndTime": "2020/11/11 16:30",
                "eventLocation": {
                    "isOnline": false,
                    "location": "2012, Victoria Street, Toronto"
                },
                "isPremium": false,
                "details": {
                    "title": "What Talent Acquisition is?",
                    "thumbnailGist": "",
                    "deadline": "2020/11/25 00:00",
                    "slug": {
                        "altText": "What Talent Acquisition is?",
                        "link": "https://www.masked.com/event/12423h",
                        "thumbnailUrl": "",
                        "url": ""
                    },
                    "descriptionHtml": "",
                    "speaker": {
                        "name": "Henry Ford",
                        "title": "Business Administration Head @ Lotto"
                    }
                },
                "isApplied": false,
                "created": "2020/10/01 19:53",
                "analytics": {
                    "appliedCount": 16,
                    "viewCount": 190
                },
                "isFeatured": false
            }],
            "recruiting": [{
                    "id": "1",
                    "tags": ["all", "recruiting"],
                    "eventStartTime": "2020/08/20 14:30",
                    "eventEndTime": "2020/08/20 15:30",
                    "eventLocation": {
                        "isOnline": true,
                        "location": ""
                    },
                    "isPremium": true,
                    "details": {
                        "title": "Virtual Hiring Event for Women",
                        "thumbnailGist": "",
                        "deadline": "2020/08/01 00:00",
                        "slug": {
                            "altText": "Virtual Hiring Event for women",
                            "link": "https://www.masked.com/event/jgsy787",
                            "thumbnailUrl": "",
                            "url": ""
                        },
                        "descriptionHtml": "",
                        "speaker": {
                            "name": "Paul Din",
                            "title": "Director of HR @ Zoop"
                        }
                    },
                    "isApplied": false,
                    "created": "2020/08/01 09:53",
                    "analytics": {
                        "appliedCount": 96,
                        "viewCount": 767
                    },
                    "isFeatured": true
                },
                {
                    "id": "3",
                    "tags": ["all", "recruiting"],
                    "eventStartTime": "2020/09/17 09:30",
                    "eventEndTime": "2020/09/18 17:30",
                    "eventLocation": {
                        "isOnline": true,
                        "location": ""
                    },
                    "isPremium": false,
                    "details": {
                        "title": "Virtual Hiring Event for 2021, Graduates",
                        "thumbnailGist": "",
                        "deadline": "2020/09/16 00:00",
                        "slug": {
                            "altText": "Virtual Hiring Event for 2021, Graduates",
                            "link": "https://www.masked.com/event/jhg2qu1",
                            "thumbnailUrl": "",
                            "url": ""
                        },
                        "descriptionHtml": "",
                        "speaker": {
                            "name": "Kevin Rodrick",
                            "title": "Marketing Head @ Google"
                        }
                    },
                    "isApplied": false,
                    "created": "2020/09/03 11:53",
                    "analytics": {
                        "appliedCount": 96,
                        "viewCount": 767
                    }
                }
            ],
            "meetup": [{
                    "id": "2",
                    "tags": ["all", "meetup"],
                    "eventStartTime": "2020/09/11 14:30",
                    "eventEndTime": "2020/09/11 15:30",
                    "eventLocation": {
                        "isOnline": false,
                        "location": "Vancouver, Canada"
                    },
                    "isPremium": false,
                    "details": {
                        "title": "2020, Graduate Hiring",
                        "thumbnailGist": "",
                        "deadline": "2020/08/31 00:00",
                        "slug": {
                            "altText": "2020, Graduate Hiring",
                            "link": "https://www.masked.com/event/uh187xj",
                            "thumbnailUrl": "",
                            "url": ""
                        },
                        "descriptionHtml": "",
                        "speaker": {
                            "name": "Asadh Sheriff",
                            "title": "Technology Recuriter @ D.E.Shaw"
                        }
                    },
                    "isApplied": false,
                    "created": "2020/09/03 11:53",
                    "analytics": {
                        "appliedCount": 96,
                        "viewCount": 767
                    },
                    "isFeatured": true
                },
                {
                    "id": "5",
                    "tags": ["all", "meetup"],
                    "eventStartTime": "2020/10/20 14:30",
                    "eventEndTime": "2020/10/20 15:30",
                    "eventLocation": {
                        "isOnline": true,
                        "location": ""
                    },
                    "isPremium": false,
                    "details": {
                        "title": "How to find a best candidate?",
                        "thumbnailGist": "",
                        "deadline": "2020/08/01 00:00",
                        "slug": {
                            "altText": "How to find a best candidate?",
                            "link": "https://www.masked.com/event/jh2iuz1",
                            "thumbnailUrl": "",
                            "url": ""
                        },
                        "descriptionHtml": "",
                        "speaker": {
                            "name": "Rodger Fernandez",
                            "title": "Founder & CTO & Zaprun"
                        }
                    },
                    "isApplied": false,
                    "created": "2020/09/10 11:53",
                    "analytics": {
                        "appliedCount": 96,
                        "viewCount": 767
                    }
                },
                {
                    "id": "6",
                    "tags": ["all", "meetup"],
                    "eventStartTime": "2020/08/20 14:30",
                    "eventEndTime": "2020/08/20 15:30",
                    "eventLocation": {
                        "isOnline": true,
                        "location": ""
                    },
                    "isPremium": false,
                    "details": {
                        "title": "Guidelines to crack interview",
                        "thumbnailGist": "",
                        "deadline": "2020/08/01 00:00",
                        "slug": {
                            "altText": "Guidelines to crack interview",
                            "link": "https://www.masked.com/event/1fsw7y8",
                            "thumbnailUrl": "",
                            "url": ""
                        },
                        "descriptionHtml": "",
                        "speaker": {
                            "name": "Lee D.",
                            "title": "Software Engineer 2 @ Walmart Labs"
                        }
                    },
                    "isApplied": false,
                    "created": "2020/09/03 11:53",
                    "analytics": {
                        "appliedCount": 96,
                        "viewCount": 767
                    }
                }
            ],
            "webinar": [{
                "id": "4",
                "tags": ["all", "webinar"],
                "eventStartTime": "2020/09/21 12:30",
                "eventEndTime": "2020/09/21 14:30",
                "eventLocation": {
                    "isOnline": true,
                    "location": ""
                },
                "isPremium": true,
                "details": {
                    "title": "Women changing the world, Webinar",
                    "thumbnailGist": "",
                    "deadline": "NA",
                    "slug": {
                        "altText": "Women changing the world, Webinar",
                        "link": "https://www.masked.com/event/lki29ial",
                        "thumbnailUrl": "",
                        "url": ""
                    },
                    "descriptionHtml": "",
                    "speaker": {
                        "name": "Kamala Harris",
                        "title": "US Senate, Democrats"
                    }
                },
                "isApplied": false,
                "created": "2020/09/03 11:53",
                "analytics": {
                    "appliedCount": 96,
                    "viewCount": 767
                },
                "isFeatured": true
            }],
            "maskedathon": [{
                "id": "7",
                "tags": ["all", "maskedathon"],
                "eventStartTime": "2020/10/28 09:30",
                "eventEndTime": "2020/10/29 17:30",
                "eventLocation": {
                    "isOnline": false,
                    "location": "Vancouver, Canada"
                },
                "isPremium": true,
                "details": {
                    "title": "Spring Hackathon for 2 days!",
                    "thumbnailGist": "",
                    "deadline": "2020/10/01 6:30",
                    "slug": {
                        "altText": "Spring Hackathon for 2 days!",
                        "link": "https://www.masked.com/event/876we9",
                        "thumbnailUrl": "",
                        "url": ""
                    },
                    "descriptionHtml": "",
                    "speaker": {
                        "name": "Bryan Raj",
                        "title": "Engineering Manager @Google"
                    }
                },
                "isApplied": false,
                "created": "2020/09/24 14:23",
                "analytics": {
                    "appliedCount": 121,
                    "viewCount": 24
                },
                "isFeatured": true
            }],
            "premiumonly": [{
                "id": "1",
                "tags": ["all", "recruiting", "premiumonly"],
                "eventStartTime": "2020/08/20 14:30",
                "eventEndTime": "2020/08/20 15:30",
                "eventLocation": {
                    "isOnline": true,
                    "location": ""
                },
                "isPremium": true,
                "details": {
                    "title": "Virtual Hiring Event for Women",
                    "thumbnailGist": "",
                    "deadline": "2020/08/01 00:00",
                    "slug": {
                        "altText": "Virtual Hiring Event for women",
                        "link": "https://www.masked.com/event/jgsy787",
                        "thumbnailUrl": "",
                        "url": ""
                    },
                    "descriptionHtml": "",
                    "speaker": {
                        "name": "Paul Din",
                        "title": "Director of HR @ Zoop"
                    }
                },
                "isApplied": false,
                "created": "2020/08/01 09:53",
                "analytics": {
                    "appliedCount": 96,
                    "viewCount": 767
                },
                "isFeatured": true
            }, {
                "id": "4",
                "tags": ["all", "webinar", "premiumonly"],
                "eventStartTime": "2020/09/21 12:30",
                "eventEndTime": "2020/09/21 14:30",
                "eventLocation": {
                    "isOnline": true,
                    "location": ""
                },
                "isPremium": true,
                "details": {
                    "title": "Women changing the world, Webinar",
                    "thumbnailGist": "",
                    "deadline": "NA",
                    "slug": {
                        "altText": "Women changing the world, Webinar",
                        "link": "https://www.masked.com/event/lki29ial",
                        "thumbnailUrl": "",
                        "url": ""
                    },
                    "descriptionHtml": "",
                    "speaker": {
                        "name": "Kamala Harris",
                        "title": "US Senate, Democrats"
                    }
                },
                "isApplied": false,
                "created": "2020/09/03 11:53",
                "analytics": {
                    "appliedCount": 96,
                    "viewCount": 767
                }
            }, {
                "id": "8",
                "tags": ["all", "leap", "premiumonly"],
                "eventStartTime": "2020/11/20 11:30",
                "eventEndTime": "2020/11/20 15:30",
                "eventLocation": {
                    "isOnline": false,
                    "location": "1056, Queen Street, Toronto"
                },
                "isPremium": true,
                "details": {
                    "title": "Career guidance Leap counselling",
                    "thumbnailGist": "",
                    "deadline": "2020/11/25 00:00",
                    "slug": {
                        "altText": "Career guidance Leap counselling",
                        "link": "https://www.masked.com/event/213hsd",
                        "thumbnailUrl": "",
                        "url": ""
                    },
                    "descriptionHtml": "",
                    "speaker": {
                        "name": "Robet Langdon",
                        "title": "Human Resource Head @ ZAAM"
                    }
                },
                "isApplied": false,
                "created": "2020/10/01 09:53",
                "analytics": {
                    "appliedCount": 116,
                    "viewCount": 87
                }
            }]
        };

        /** before you read the comments assume this part of code is in backend so it is understandable */
        this.dataPagingState = {
            "all": {
                fetchComplete: false, // once the data runs out after fetching by pages based on tag, it will mark this flag as true. 
                //when a new event is created by admin at the backend, this will be reset to false across all users
                lastFetchPageState: {
                    // this will be like page number and page size
                }
            },
            "leap": {
                fetchComplete: false,
                lastFetchPageState: {

                }
            },
            "recruiting": {
                fetchComplete: false,
                lastFetchPageState: {

                }
            },
            "premiumonly": {
                fetchComplete: false,
                lastFetchPageState: {

                }
            },
            "meetup": {
                fetchComplete: false,
                lastFetchPageState: {

                }
            },
            "webinar": {
                fetchComplete: false,
                lastFetchPageState: {

                }
            },
            "maskedathon": {
                fetchComplete: false,
                lastFetchPageState: {

                }
            }
        };
        this.defaultPageSize = 32;

    }

    getDataForTag(tag) {
        const tagToFetch = tag || "all";
        if (!this.dataPagingState[tag].fetchComplete) {
            let data = JSON.parse(JSON.stringify(this.data[tagToFetch]));
            if (data && data.length < this.defaultPageSize) {
                this.dataPagingState[tag].fetchComplete = true;
            }
            return data || [];
        }
        return [];
    }
}