import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MenuService, SettingsService, User, _HttpClient } from '@delon/theme';
import { NzSafeAny } from 'ng-zorro-antd/core/types';

@Component({
  selector: 'layout-sidebar',
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  get user(): User {
    return this.settings.user;
  }

  constructor(private settings: SettingsService, private httpClient: _HttpClient, private menuService: MenuService) {
    console.log('load sidebar menu value');

    // this.httpClient.get('assets/tmp/app-data.json')
    //   .subscribe((res: any) => {
    //
    //     console.log(res.menu);
    //
    //     // 初始化菜单
    //     this.menuService.add(res.menu);
    //   });

    this.httpClient.get('api/blade-system/menu/routes').subscribe((res: any) => {
      const menuData = [
        {
          text: '主导航',
          group: true,
          hideInBreadcrumb: true,
          children: res.data,
        },
      ];

      // 初始化菜单
      this.menuService.clear();
      this.menuService.add(menuData);
    });
  }
}
