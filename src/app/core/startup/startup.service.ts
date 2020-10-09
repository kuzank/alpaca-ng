import { Inject, Injectable } from '@angular/core';
import { ACLService } from '@delon/acl';
import { ALAIN_I18N_TOKEN, MenuService, SettingsService, TitleService, _HttpClient } from '@delon/theme';
import { TranslateService } from '@ngx-translate/core';
import { website } from '@shared';
import { NzIconService } from 'ng-zorro-antd/icon';
import { zip } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ICONS } from '../../../style-icons';
import { ICONS_AUTO } from '../../../style-icons-auto';
import { I18NService } from '../i18n/i18n.service';

/**
 * 用于应用启动时
 * 一般用来获取应用所需要的基础数据等
 */
@Injectable()
export class StartupService {
  constructor(
    iconSrv: NzIconService,
    private translate: TranslateService,
    @Inject(ALAIN_I18N_TOKEN) private i18n: I18NService,
    private settingService: SettingsService,
    private aclService: ACLService,
    private titleService: TitleService,
    private httpClient: _HttpClient,
  ) {
    iconSrv.addIcon(...ICONS_AUTO, ...ICONS);

    // 设置页面标题的后缀
    this.titleService.default = '';
    this.titleService.suffix = website.title;

    // ACL：设置权限为全量
    this.aclService.setFull(true);
  }

  load(): Promise<void> {
    this.httpClient.get(`assets/tmp/i18n/${this.i18n.defaultLang}.json`).subscribe((langData) => {
      this.translate.setTranslation(this.i18n.defaultLang, langData);
      this.translate.setDefaultLang(this.i18n.defaultLang);
    });

    return new Promise((resolve) => {
      zip(this.httpClient.get('api/blade-system/menu/buttons?_allow_anonymous=true'))
        .pipe(
          // 接收其他拦截器后产生的异常消息
          catchError((res) => {
            console.warn(`StartupService.load: Network request failed`, res);
            resolve();
            return [];
          }),
        )
        .subscribe(
          ([buttons]) => {
            // TODO handle buttons
            // console.log(buttons);
          },
          () => {},
          () => {
            resolve();
          },
        );
    });
  }
}
