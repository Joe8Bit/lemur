'use strict';

angular.module('lemur')
  .service('CertificateApi', function (LemurRestangular, DomainService) {
    LemurRestangular.extendModel('certificates', function (obj) {
      return angular.extend(obj, {
        attachAuthority: function (authority) {
          this.authority = authority;
          this.authority.maxDate = moment(this.authority.notAfter).subtract(1, 'days').format('YYYY/MM/DD');
        },
       attachSubAltName: function () {
         if (this.extensions === undefined) {
           this.extensions = {};
         }

         if (this.extensions.subAltNames === undefined) {
           this.extensions.subAltNames = {'names': []};
         }

         if (!angular.isString(this.subAltType)) {
           this.subAltType = 'CNAME';
         }

         if (angular.isString(this.subAltValue) && angular.isString(this.subAltType)) {
           this.extensions.subAltNames.names.push({'nameType': this.subAltType, 'value': this.subAltValue});
           this.findDuplicates();
         }

         this.subAltType = null;
         this.subAltValue = null;
       },
        removeSubAltName: function (index) {
          this.extensions.subAltNames.names.splice(index, 1);
          this.findDuplicates();
        },
        attachCustom: function () {
          if (this.extensions === undefined || this.extensions.custom === undefined) {
            this.extensions = {'custom': []};
          }

          if (angular.isString(this.customOid) && angular.isString(this.customEncoding) && angular.isString(this.customValue)) {
            this.extensions.custom.push(
              {
                'oid': this.customOid,
                'isCritical': this.customIsCritical,
                'encoding': this.customEncoding,
                'value': this.customValue
              }
            );
          }

          this.customOid = null;
          this.customIsCritical = null;
          this.customEncoding = null;
          this.customValue = null;
        },
        removeCustom: function (index) {
          this.extensions.custom.splice(index, 1);
        },
        attachDestination: function (destination) {
          this.selectedDestination = null;
          if (this.destinations === undefined) {
            this.destinations = [];
          }
          this.destinations.push(destination);
        },
        removeDestination: function (index) {
          this.destinations.splice(index, 1);
        },
        attachReplacement: function (replacement) {
          this.selectedReplacement = null;
          if (this.replacements === undefined) {
            this.replacements = [];
          }
          this.replacements.push(replacement);
        },
        removeReplacement: function (index) {
          this.replacements.splice(index, 1);
        },
        attachNotification: function (notification) {
          this.selectedNotification = null;
          if (this.notifications === undefined) {
            this.notifications = [];
          }
          this.notifications.push(notification);
        },
        removeNotification: function (index) {
          this.notifications.splice(index, 1);
        },
        findDuplicates: function () {
          DomainService.findDomainByName(this.extensions.subAltNames[0]).then(function (domains) { //We should do a better job of searching for multiple domains
            this.duplicates = domains.total;
          });
        },
        useTemplate: function () {
          this.extensions = this.template.extensions;
        }
      });
    });
    return LemurRestangular.all('certificates');
  })
  .service('CertificateService', function ($location, CertificateApi, AuthorityService, LemurRestangular, DefaultService) {
    var CertificateService = this;
    CertificateService.findCertificatesByName = function (filterValue) {
      return CertificateApi.getList({'filter[name]': filterValue})
        .then(function (certificates) {
          return certificates;
        });
    };

    CertificateService.create = function (certificate) {
      certificate.attachSubAltName();
      // Help users who may have just typed in their authority
      if (!certificate.authority) {
        AuthorityService.findActiveAuthorityByName(certificate.selectedAuthority).then(function (authorities) {
          if (authorities.length > 0) {
            certificate.authority = authorities[0];
          }
        });
      }
      return CertificateApi.post(certificate);
    };

    CertificateService.update = function (certificate) {
      return LemurRestangular.copy(certificate).put();
    };

    CertificateService.upload = function (certificate) {
      return CertificateApi.customPOST(certificate, 'upload');
    };

    CertificateService.getAuthority = function (certificate) {
      return certificate.customGET('authority').then(function (authority) {
        certificate.authority = authority;
      });
    };

    CertificateService.getCreator = function (certificate) {
      return certificate.customGET('creator').then(function (creator) {
        certificate.creator = creator;
      });
    };

    CertificateService.getDestinations = function (certificate) {
      return certificate.getList('destinations').then(function (destinations) {
        certificate.destinations = destinations;
      });
    };

    CertificateService.getNotifications = function (certificate) {
      return certificate.getList('notifications').then(function (notifications) {
        certificate.notifications = notifications;
      });
    };

    CertificateService.getDomains = function (certificate) {
      return certificate.getList('domains').then(function (domains) {
        certificate.domains = domains;
      });
    };

    CertificateService.getReplacements = function (certificate) {
      return certificate.getList('replacements').then(function (replacements) {
        certificate.replacements = replacements;
      });
    };

    CertificateService.getDefaults = function (certificate) {
      return DefaultService.get().then(function (defaults) {
        certificate.country = defaults.country;
        certificate.state = defaults.state;
        certificate.location = defaults.location;
        certificate.organization = defaults.organization;
        certificate.organizationalUnit = defaults.organizationalUnit;
      });
    };

    CertificateService.loadPrivateKey = function (certificate) {
      return certificate.customGET('key');
    };

    CertificateService.updateActive = function (certificate) {
      return certificate.put();
    };

    return CertificateService;
  });
